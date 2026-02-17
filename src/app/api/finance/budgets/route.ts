import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";

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

    const budgets = await prisma.budget.findMany({
      where: { organizationId },
      orderBy: [{ fiscalYear: "desc" }, { createdAt: "desc" }],
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

    return NextResponse.json({
      data: budgets.map((b) => ({
        ...b,
        totalAmount: Number(b.totalAmount),
        lineItems: b.lineItems.map((li) => ({
          ...li,
          q1Amount: Number(li.q1Amount),
          q2Amount: Number(li.q2Amount),
          q3Amount: Number(li.q3Amount),
          q4Amount: Number(li.q4Amount),
          totalAmount: Number(li.totalAmount),
          actualAmount: Number(li.actualAmount),
        })),
      })),
    });
  } catch (error) {
    console.error("Budgets API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePermission("budgets", "create");
    if (isAuthError(authResult)) return authResult;

    const body = await request.json();
    const {
      departmentId,
      fiscalYear,
      periodType,
      totalAmount,
      lineItems,
    } = body;

    const organizationId = await resolveOrganizationId(
      authResult.userId,
      body.organizationId ?? null
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    if (!departmentId || !fiscalYear || !totalAmount) {
      return NextResponse.json(
        { error: "departmentId, fiscalYear, and totalAmount are required" },
        { status: 400 }
      );
    }

    const budget = await prisma.budget.create({
      data: {
        organizationId,
        departmentId,
        fiscalYear,
        periodType: periodType || "ANNUAL",
        totalAmount,
        createdById: authResult.userId,
        lineItems: lineItems?.length
          ? {
              create: lineItems.map(
                (item: {
                  glAccountId: string;
                  description?: string;
                  q1Amount?: number;
                  q2Amount?: number;
                  q3Amount?: number;
                  q4Amount?: number;
                  totalAmount?: number;
                }) => ({
                  glAccountId: item.glAccountId,
                  description: item.description || null,
                  q1Amount: item.q1Amount || 0,
                  q2Amount: item.q2Amount || 0,
                  q3Amount: item.q3Amount || 0,
                  q4Amount: item.q4Amount || 0,
                  totalAmount: item.totalAmount || 0,
                })
              ),
            }
          : undefined,
      },
      include: {
        department: { select: { name: true, code: true } },
        lineItems: {
          include: {
            glAccount: { select: { code: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      ...budget,
      totalAmount: Number(budget.totalAmount),
      lineItems: budget.lineItems.map((li) => ({
        ...li,
        q1Amount: Number(li.q1Amount),
        q2Amount: Number(li.q2Amount),
        q3Amount: Number(li.q3Amount),
        q4Amount: Number(li.q4Amount),
        totalAmount: Number(li.totalAmount),
        actualAmount: Number(li.actualAmount),
      })),
    }, { status: 201 });
  } catch (error) {
    console.error("Create budget error:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A budget already exists for this department and fiscal year" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}
