import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";
import { validateExpensePolicy } from "@/lib/workflow/policies";
import { Prisma } from "@prisma/client";

/**
 * GET /api/expenses
 * List expenses for an organization, with optional filters.
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

    const status = searchParams.get("status");
    const submittedById = searchParams.get("submittedById");
    const scope = searchParams.get("scope"); // "my" | "team"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    const where: Prisma.ExpenseWhereInput = { organizationId };

    if (status) {
      where.status = status as Prisma.EnumExpenseStatusFilter;
    }
    if (submittedById) {
      where.submittedById = submittedById;
    } else if (scope === "my") {
      where.submittedById = session.user.id;
    }

    const [data, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          submittedBy: {
            select: { firstName: true, lastName: true, email: true },
          },
          department: { select: { id: true, name: true, code: true } },
          costCenter: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    return NextResponse.json({
      data: data.map((exp) => ({
        id: exp.id,
        title: exp.title,
        amount: Number(exp.amount),
        categorySlug: exp.categorySlug,
        status: exp.status,
        receiptUrl: exp.receiptUrl,
        occurredAt: exp.occurredAt,
        policyViolations: exp.policyViolations,
        submittedBy: exp.submittedBy,
        department: exp.department,
        costCenter: exp.costCenter,
        createdAt: exp.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Expenses GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/expenses
 * Create a new expense in DRAFT status.
 * Validates against expense policies before saving.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      amount,
      categorySlug,
      departmentId,
      costCenterId,
      receiptUrl,
      occurredAt,
    } = body;

    const organizationId = await resolveOrganizationId(
      session.user.id,
      body.organizationId ?? null
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    if (!title || amount == null) {
      return NextResponse.json(
        { error: "title and amount are required" },
        { status: 400 }
      );
    }

    // Validate expense against company policies
    const violations = validateExpensePolicy({
      amount,
      categorySlug,
      receiptUrl,
      title,
    });

    const hasErrors = violations.some((v) => v.severity === "error");
    if (hasErrors) {
      return NextResponse.json(
        {
          error: "Expense violates policy",
          violations: violations.filter((v) => v.severity === "error"),
        },
        { status: 422 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        organizationId,
        submittedById: session.user.id,
        title,
        amount,
        categorySlug: categorySlug || null,
        departmentId: departmentId || null,
        costCenterId: costCenterId || null,
        receiptUrl: receiptUrl || null,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        status: "DRAFT",
        policyViolations: violations.length > 0 ? (violations as unknown as Prisma.InputJsonValue) : undefined,
      },
      include: {
        submittedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
        department: { select: { id: true, name: true, code: true } },
        costCenter: { select: { id: true, name: true, code: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "expense.create",
        resource: "expense",
        resourceId: expense.id,
        details: { amount, title, categorySlug },
      },
    });

    return NextResponse.json(
      {
        data: {
          id: expense.id,
          title: expense.title,
          amount: Number(expense.amount),
          categorySlug: expense.categorySlug,
          status: expense.status,
          receiptUrl: expense.receiptUrl,
          occurredAt: expense.occurredAt,
          policyViolations: expense.policyViolations,
          submittedBy: expense.submittedBy,
          department: expense.department,
          costCenter: expense.costCenter,
          createdAt: expense.createdAt,
        },
        warnings: violations.filter((v) => v.severity === "warning"),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Expenses POST error:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
