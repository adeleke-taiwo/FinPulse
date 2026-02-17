import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startWorkflow } from "@/lib/workflow/engine";

/**
 * POST /api/expenses/[id]/submit
 * Submit a DRAFT expense for approval.
 * Changes status from DRAFT to SUBMITTED and starts the approval workflow.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the expense
    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    // Only the submitter can submit their own expense
    if (expense.submittedById !== session.user.id) {
      return NextResponse.json(
        { error: "Only the expense creator can submit it" },
        { status: 403 }
      );
    }

    // Must be in DRAFT status to submit
    if (expense.status !== "DRAFT") {
      return NextResponse.json(
        { error: `Cannot submit expense with status ${expense.status}. Must be DRAFT.` },
        { status: 400 }
      );
    }

    // Find the EXPENSE_APPROVAL workflow template for this organization
    const workflowTemplate = await prisma.workflowTemplate.findFirst({
      where: {
        organizationId: expense.organizationId,
        type: "EXPENSE_APPROVAL",
        isActive: true,
      },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });

    if (!workflowTemplate) {
      return NextResponse.json(
        { error: "No active expense approval workflow found for this organization" },
        { status: 422 }
      );
    }

    // Atomically update expense status and start workflow
    const updatedExpense = await prisma.expense.update({
      where: { id, status: "DRAFT" },
      data: { status: "SUBMITTED" },
    });

    const workflowInstance = await startWorkflow({
      templateId: workflowTemplate.id,
      resourceType: "expense",
      resourceId: expense.id,
      submittedById: session.user.id,
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "expense.submit",
        resource: "expense",
        resourceId: expense.id,
        details: {
          amount: Number(expense.amount),
          workflowInstanceId: workflowInstance.id,
        },
      },
    });

    return NextResponse.json({
      data: {
        expense: {
          id: updatedExpense.id,
          title: updatedExpense.title,
          amount: Number(updatedExpense.amount),
          status: updatedExpense.status,
        },
        workflow: {
          instanceId: workflowInstance.id,
          status: workflowInstance.status,
          currentStep: workflowInstance.currentStep,
          templateName: workflowTemplate.name,
          totalSteps: workflowTemplate.steps.length,
        },
      },
    });
  } catch (error) {
    console.error("Expense submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit expense" },
      { status: 500 }
    );
  }
}
