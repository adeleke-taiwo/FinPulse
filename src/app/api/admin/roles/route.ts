import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";

/**
 * GET /api/admin/roles
 * List custom roles for an organization.
 * Pass ?organizationId=xxx or defaults to user's first org membership.
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

    const roles = await prisma.customRole.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: roles });
  } catch (error) {
    console.error("Roles GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/roles
 * Create a custom role with a name and permissions JSON.
 * Body: { organizationId?, name, permissions }
 * permissions example: { "expenses": ["view","create"], "gl": ["view","approve"] }
 * Requires SUPER_ADMIN or CFO role.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, permissions } = body;

    if (!name || !permissions) {
      return NextResponse.json(
        { error: "name and permissions are required" },
        { status: 400 }
      );
    }

    if (typeof permissions !== "object" || Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "permissions must be a JSON object" },
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

    // Verify user is SUPER_ADMIN or CFO
    const member = await prisma.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId,
        },
      },
    });

    if (!member || !["SUPER_ADMIN", "CFO"].includes(member.role)) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    // Check unique constraint: (organizationId, name)
    const existing = await prisma.customRole.findUnique({
      where: {
        organizationId_name: { organizationId, name },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A role with this name already exists in the organization" },
        { status: 409 }
      );
    }

    const role = await prisma.customRole.create({
      data: {
        organizationId,
        name,
        permissions,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "customRole.create",
        resource: "customRole",
        resourceId: role.id,
        details: { name, permissions },
      },
    });

    return NextResponse.json({ data: role }, { status: 201 });
  } catch (error) {
    console.error("Roles POST error:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/roles
 * Update an existing custom role's permissions (and optionally name).
 * Body: { roleId, name?, permissions? }
 * Requires SUPER_ADMIN or CFO role.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roleId, name, permissions } = body;

    if (!roleId) {
      return NextResponse.json(
        { error: "roleId is required" },
        { status: 400 }
      );
    }

    if (!name && !permissions) {
      return NextResponse.json(
        { error: "At least one of name or permissions must be provided" },
        { status: 400 }
      );
    }

    if (permissions && (typeof permissions !== "object" || Array.isArray(permissions))) {
      return NextResponse.json(
        { error: "permissions must be a JSON object" },
        { status: 400 }
      );
    }

    // Fetch the role to get its organizationId
    const existingRole = await prisma.customRole.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    // Verify user is SUPER_ADMIN or CFO in the role's org
    const member = await prisma.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: existingRole.organizationId,
        },
      },
    });

    if (!member || !["SUPER_ADMIN", "CFO"].includes(member.role)) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    // If name is being changed, check uniqueness
    if (name && name !== existingRole.name) {
      const duplicate = await prisma.customRole.findUnique({
        where: {
          organizationId_name: {
            organizationId: existingRole.organizationId,
            name,
          },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "A role with this name already exists in the organization" },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (permissions !== undefined) updateData.permissions = permissions;

    const updated = await prisma.customRole.update({
      where: { id: roleId },
      data: updateData,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "customRole.update",
        resource: "customRole",
        resourceId: roleId,
        details: { updatedFields: Object.keys(updateData) },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Roles PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}
