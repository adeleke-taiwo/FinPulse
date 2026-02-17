import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";
import { getPendingApprovals, processApproval } from "@/lib/workflow/engine";

/**
 * GET /api/approvals
 * List pending approvals for the current user within an organization.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const organizationId = await resolveOrganizationId(
      session.user.id,
      searchParams.get("organizationId")
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const pendingApprovals = await getPendingApprovals(
      session.user.id,
      organizationId
    );

    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const total = pendingApprovals.length;
    const paged = pendingApprovals.slice((page - 1) * limit, page * limit);

    // Fetch amounts for linked resources in bulk
    const expenseIds = paged.filter((i) => i.resourceType === "expense").map((i) => i.resourceId);
    const invoiceIds = paged.filter((i) => i.resourceType === "invoice").map((i) => i.resourceId);

    const [expenses, invoices] = await Promise.all([
      expenseIds.length
        ? prisma.expense.findMany({ where: { id: { in: expenseIds } }, select: { id: true, amount: true } })
        : [],
      invoiceIds.length
        ? prisma.invoice.findMany({ where: { id: { in: invoiceIds } }, select: { id: true, totalAmount: true } })
        : [],
    ]);

    const amountMap: Record<string, number> = {};
    for (const e of expenses) amountMap[e.id] = Number(e.amount);
    for (const inv of invoices) amountMap[inv.id] = Number(inv.totalAmount);

    return NextResponse.json({
      data: paged.map((inst) => ({
        instanceId: inst.id,
        resourceType: inst.resourceType,
        resourceId: inst.resourceId,
        status: inst.status,
        currentStep: inst.currentStep,
        templateName: inst.template.name,
        templateType: inst.template.type,
        totalSteps: inst.template.steps.length,
        amount: amountMap[inst.resourceId] || 0,
        submittedBy: inst.submittedBy,
        steps: inst.template.steps.map((s) => ({
          stepOrder: s.stepOrder,
          name: s.name,
        })),
        stepActions: inst.stepActions.map((sa) => ({
          stepOrder: sa.stepOrder,
          status: sa.status,
          actedAt: sa.actedAt,
        })),
        createdAt: inst.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Approvals GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending approvals" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/approvals
 * Approve or reject a workflow step.
 * Body: { instanceId, stepOrder, status: "APPROVED"|"REJECTED", comment? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { instanceId, stepOrder, status, comment } = body;

    if (!instanceId || stepOrder == null || !status) {
      return NextResponse.json(
        { error: "instanceId, stepOrder, and status are required" },
        { status: 400 }
      );
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "status must be APPROVED or REJECTED" },
        { status: 400 }
      );
    }

    const result = await processApproval({
      instanceId,
      stepOrder,
      actorId: session.user.id,
      status,
      comment: comment || undefined,
    });

    // If the workflow reached a final state, update the linked resource
    if (result.status === "APPROVED" || result.status === "REJECTED") {
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: instanceId },
      });

      if (instance && instance.resourceType === "expense") {
        await prisma.expense.update({
          where: { id: instance.resourceId },
          data: {
            status: result.status === "APPROVED" ? "APPROVED" : "REJECTED",
          },
        });
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: `workflow.${status.toLowerCase()}`,
        resource: "workflow_instance",
        resourceId: instanceId,
        details: { stepOrder, status, comment },
      },
    });

    return NextResponse.json({
      data: {
        instanceId,
        workflowStatus: result.status,
        nextStep: result.nextStep,
        actionTaken: status,
      },
    });
  } catch (error) {
    console.error("Approvals POST error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process approval";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
