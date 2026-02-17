import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            glAccount: { select: { code: true, name: true } },
          },
        },
        createdBy: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }

    // Verify org access
    const organizationId = await resolveOrganizationId(session.user.id, null);
    if (organizationId && entry.organizationId !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      data: {
        ...entry,
        lines: entry.lines.map((line) => ({
          ...line,
          debit: Number(line.debit),
          credit: Number(line.credit),
        })),
      },
    });
  } catch (error) {
    console.error("Journal entry GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch journal entry" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/finance/journal/[id]
 * Update journal entry status: approve, post, or reject.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body as { action: "approve" | "post" | "reject" };

    if (!["approve", "post", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const entry = await prisma.journalEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }

    // Verify org access
    const organizationId = await resolveOrganizationId(session.user.id, null);
    if (organizationId && entry.organizationId !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      approve: ["DRAFT", "PENDING_APPROVAL"],
      post: ["APPROVED"],
      reject: ["PENDING_APPROVAL"],
    };

    if (!validTransitions[action].includes(entry.status)) {
      return NextResponse.json(
        { error: `Cannot ${action} an entry with status ${entry.status}` },
        { status: 400 }
      );
    }

    const statusMap: Record<string, string> = {
      approve: "APPROVED",
      post: "POSTED",
      reject: "DRAFT",
    };

    const updateData: Record<string, unknown> = { status: statusMap[action] };
    if (action === "approve") {
      updateData.approvedById = session.user.id;
      updateData.approvedAt = new Date();
    }

    const updated = await prisma.journalEntry.update({
      where: { id },
      data: updateData,
      include: {
        lines: {
          include: { glAccount: { select: { code: true, name: true } } },
        },
        createdBy: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: `journal_entry.${action}`,
        resource: "journal_entry",
        resourceId: id,
        details: { previousStatus: entry.status, newStatus: statusMap[action] },
      },
    });

    return NextResponse.json({
      data: {
        ...updated,
        lines: updated.lines.map((line) => ({
          ...line,
          debit: Number(line.debit),
          credit: Number(line.credit),
        })),
      },
    });
  } catch (error) {
    console.error("Journal entry PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update journal entry" },
      { status: 500 }
    );
  }
}
