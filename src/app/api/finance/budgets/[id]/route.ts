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

    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        department: { select: { name: true, code: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        lineItems: {
          include: {
            glAccount: { select: { code: true, name: true } },
          },
        },
      },
    });

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    const organizationId = await resolveOrganizationId(session.user.id, null);
    if (organizationId && budget.organizationId !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const lineItems = budget.lineItems.map((li) => ({
      id: li.id,
      accountCode: li.glAccount.code,
      accountName: li.glAccount.name,
      q1Amount: Number(li.q1Amount),
      q2Amount: Number(li.q2Amount),
      q3Amount: Number(li.q3Amount),
      q4Amount: Number(li.q4Amount),
      totalAmount: Number(li.totalAmount),
      actualAmount: Number(li.actualAmount),
    }));

    const spentAmount = lineItems.reduce((sum, li) => sum + li.actualAmount, 0);

    return NextResponse.json({
      id: budget.id,
      department: budget.department?.name || "Unknown",
      fiscalYear: budget.fiscalYear,
      status: budget.status,
      periodType: budget.periodType,
      totalAmount: Number(budget.totalAmount),
      spentAmount,
      createdAt: budget.createdAt,
      lineItems,
    });
  } catch (error) {
    console.error("Budget detail GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    );
  }
}
