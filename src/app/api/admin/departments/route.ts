import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";

/**
 * GET /api/admin/departments
 * List departments for an organization with hierarchy (parent/children).
 * Pass ?organizationId=xxx or defaults to user's first org membership.
 * Optional filters: ?subsidiaryId=xxx&parentId=xxx
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

    const subsidiaryId = searchParams.get("subsidiaryId");
    const parentId = searchParams.get("parentId");

    // Build filter
    const where: Record<string, unknown> = { organizationId };
    if (subsidiaryId) where.subsidiaryId = subsidiaryId;
    if (parentId) {
      where.parentId = parentId;
    } else if (!searchParams.has("parentId")) {
      // By default, return top-level departments (no parent) for hierarchy view
      // Pass parentId=all to get all departments flat
      if (!searchParams.has("flat")) {
        where.parentId = null;
      }
    }

    const departments = await prisma.department.findMany({
      where,
      include: {
        subsidiary: {
          select: { id: true, name: true, code: true },
        },
        parent: {
          select: { id: true, name: true, code: true },
        },
        children: {
          select: {
            id: true,
            name: true,
            code: true,
            children: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: { name: "asc" },
        },
        head: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: {
            members: true,
            costCenters: true,
            expenses: true,
            budgets: true,
          },
        },
        budgets: {
          where: { status: "ACTIVE" },
          select: {
            totalAmount: true,
            lineItems: {
              select: {
                totalAmount: true,
                actualAmount: true,
              },
            },
          },
          take: 1,
          orderBy: { fiscalYear: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // Enrich departments with budget summary
    const enriched = departments.map((dept) => {
      const activeBudget = dept.budgets[0];
      const budgetTotal = activeBudget ? Number(activeBudget.totalAmount) : 0;
      const budgetSpent = activeBudget
        ? activeBudget.lineItems.reduce((sum, li) => sum + Number(li.actualAmount), 0)
        : 0;
      const utilization = budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0;

      const { budgets: _budgets, ...rest } = dept;
      return {
        ...rest,
        budgetTotal,
        budgetSpent,
        utilization: parseFloat(utilization.toFixed(1)),
      };
    });

    return NextResponse.json({ data: enriched });
  } catch (error) {
    console.error("Departments GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/departments
 * Create a new department.
 * Body: { organizationId?, subsidiaryId?, parentId?, name, code, headUserId? }
 * Requires SUPER_ADMIN, CFO, or FINANCE_MANAGER role.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      subsidiaryId,
      parentId,
      name,
      code,
      headUserId,
    } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "name and code are required" },
        { status: 400 }
      );
    }

    const organizationId = await resolveOrganizationId(
      session.user.id,
      body.organizationId ?? null
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Verify user has admin-level role
    const member = await prisma.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId,
        },
      },
    });

    if (
      !member ||
      !["SUPER_ADMIN", "CFO", "FINANCE_MANAGER"].includes(member.role)
    ) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    // Check unique constraint: (organizationId, code)
    const existing = await prisma.department.findUnique({
      where: {
        organizationId_code: { organizationId, code },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A department with this code already exists in the organization" },
        { status: 409 }
      );
    }

    // Validate parentId belongs to same org if provided
    if (parentId) {
      const parentDept = await prisma.department.findFirst({
        where: { id: parentId, organizationId },
      });
      if (!parentDept) {
        return NextResponse.json(
          { error: "Parent department not found in this organization" },
          { status: 400 }
        );
      }
    }

    // Validate subsidiaryId belongs to same org if provided
    if (subsidiaryId) {
      const subsidiary = await prisma.subsidiary.findFirst({
        where: { id: subsidiaryId, organizationId },
      });
      if (!subsidiary) {
        return NextResponse.json(
          { error: "Subsidiary not found in this organization" },
          { status: 400 }
        );
      }
    }

    const department = await prisma.department.create({
      data: {
        organizationId,
        subsidiaryId: subsidiaryId || null,
        parentId: parentId || null,
        name,
        code,
        headUserId: headUserId || null,
      },
      include: {
        subsidiary: {
          select: { id: true, name: true, code: true },
        },
        parent: {
          select: { id: true, name: true, code: true },
        },
        head: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "department.create",
        resource: "department",
        resourceId: department.id,
        details: { name, code, subsidiaryId, parentId },
      },
    });

    return NextResponse.json({ data: department }, { status: 201 });
  } catch (error) {
    console.error("Department POST error:", error);
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}
