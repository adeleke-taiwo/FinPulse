import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";
import { OrgRole } from "@prisma/client";

/**
 * GET /api/admin/members
 * List organization members with user info.
 * Pass ?organizationId=xxx or defaults to user's first org membership.
 * Optional filters: ?departmentId=xxx&role=EMPLOYEE&search=john
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

    const departmentId = searchParams.get("departmentId");
    const role = searchParams.get("role");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    // Build filter
    const where: Record<string, unknown> = { organizationId };
    if (departmentId) where.departmentId = departmentId;
    if (role) where.role = role as OrgRole;
    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [members, total] = await Promise.all([
      prisma.orgMember.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true,
            },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
          customRole: {
            select: { id: true, name: true, permissions: true },
          },
          manager: {
            select: {
              id: true,
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: [
          { role: "asc" },
          { user: { firstName: "asc" } },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.orgMember.count({ where }),
    ]);

    return NextResponse.json({
      data: members,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Members GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/members
 * Add a member to the organization.
 * Body: { organizationId?, userId, role, departmentId?, title?, managerId? }
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
      userId,
      role,
      departmentId,
      title,
      managerId,
    } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId and role are required" },
        { status: 400 }
      );
    }

    // Validate role is a valid OrgRole
    const validRoles: string[] = [
      "SUPER_ADMIN",
      "CFO",
      "FINANCE_MANAGER",
      "DEPARTMENT_HEAD",
      "ANALYST",
      "EMPLOYEE",
      "AUDITOR",
      "EXTERNAL_ACCOUNTANT",
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
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
    const currentMember = await prisma.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId,
        },
      },
    });

    if (
      !currentMember ||
      !["SUPER_ADMIN", "CFO", "FINANCE_MANAGER"].includes(currentMember.role)
    ) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.orgMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 409 }
      );
    }

    // Validate departmentId belongs to same org if provided
    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, organizationId },
      });
      if (!dept) {
        return NextResponse.json(
          { error: "Department not found in this organization" },
          { status: 400 }
        );
      }
    }

    // Validate managerId belongs to same org if provided
    if (managerId) {
      const managerMember = await prisma.orgMember.findFirst({
        where: { id: managerId, organizationId },
      });
      if (!managerMember) {
        return NextResponse.json(
          { error: "Manager not found in this organization" },
          { status: 400 }
        );
      }
    }

    const member = await prisma.orgMember.create({
      data: {
        userId,
        organizationId,
        role: role as OrgRole,
        departmentId: departmentId || null,
        title: title || null,
        managerId: managerId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "orgMember.create",
        resource: "orgMember",
        resourceId: member.id,
        details: { userId, role, departmentId, title },
      },
    });

    return NextResponse.json({ data: member }, { status: 201 });
  } catch (error) {
    console.error("Members POST error:", error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/members
 * Update a member's role, department, title, or manager.
 * Body: { memberId, role?, departmentId?, title?, customRoleId?, managerId? }
 * Requires SUPER_ADMIN, CFO, or FINANCE_MANAGER role.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, role, departmentId, title, customRoleId, managerId } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 }
      );
    }

    // Fetch existing member to get organizationId
    const existingMember = await prisma.orgMember.findUnique({
      where: { id: memberId },
    });

    if (!existingMember) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Verify current user has admin-level role in the same org
    const currentMember = await prisma.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: existingMember.organizationId,
        },
      },
    });

    if (
      !currentMember ||
      !["SUPER_ADMIN", "CFO", "FINANCE_MANAGER"].includes(currentMember.role)
    ) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    // Validate role if provided
    if (role) {
      const validRoles: string[] = [
        "SUPER_ADMIN",
        "CFO",
        "FINANCE_MANAGER",
        "DEPARTMENT_HEAD",
        "ANALYST",
        "EMPLOYEE",
        "AUDITOR",
        "EXTERNAL_ACCOUNTANT",
      ];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate departmentId if provided
    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: {
          id: departmentId,
          organizationId: existingMember.organizationId,
        },
      });
      if (!dept) {
        return NextResponse.json(
          { error: "Department not found in this organization" },
          { status: 400 }
        );
      }
    }

    // Validate customRoleId if provided
    if (customRoleId) {
      const customRole = await prisma.customRole.findFirst({
        where: {
          id: customRoleId,
          organizationId: existingMember.organizationId,
        },
      });
      if (!customRole) {
        return NextResponse.json(
          { error: "Custom role not found in this organization" },
          { status: 400 }
        );
      }
    }

    // Validate managerId if provided
    if (managerId) {
      const managerMember = await prisma.orgMember.findFirst({
        where: {
          id: managerId,
          organizationId: existingMember.organizationId,
        },
      });
      if (!managerMember) {
        return NextResponse.json(
          { error: "Manager not found in this organization" },
          { status: 400 }
        );
      }
      // Prevent self-referencing manager
      if (managerId === memberId) {
        return NextResponse.json(
          { error: "A member cannot be their own manager" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (role !== undefined) updateData.role = role as OrgRole;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (title !== undefined) updateData.title = title || null;
    if (customRoleId !== undefined) updateData.customRoleId = customRoleId || null;
    if (managerId !== undefined) updateData.managerId = managerId || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.orgMember.update({
      where: { id: memberId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
        customRole: {
          select: { id: true, name: true, permissions: true },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "orgMember.update",
        resource: "orgMember",
        resourceId: memberId,
        details: { updatedFields: Object.keys(updateData) },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Members PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}
