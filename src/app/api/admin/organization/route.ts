import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";

/**
 * GET /api/admin/organization
 * List organization details for the current user's org.
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

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subsidiaries: {
          select: { id: true, name: true, code: true, country: true, currency: true },
          orderBy: { name: "asc" },
        },
        _count: {
          select: {
            members: true,
            departments: true,
            customRoles: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: organization });
  } catch (error) {
    console.error("Organization GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/organization
 * Create or update a subsidiary.
 * Body: { organizationId, subsidiaryId?, name, code, country, currency }
 * If subsidiaryId is provided, updates; otherwise creates.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subsidiaryId, name, code, country, currency } = body;

    const organizationId = await resolveOrganizationId(
      session.user.id,
      body.organizationId ?? null
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

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

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    let subsidiary;
    if (subsidiaryId) {
      const existing = await prisma.subsidiary.findFirst({
        where: { id: subsidiaryId, organizationId },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Subsidiary not found in this organization" },
          { status: 404 }
        );
      }
      subsidiary = await prisma.subsidiary.update({
        where: { id: subsidiaryId },
        data: { name, code, country: country || "US", currency: currency || "USD" },
      });
    } else {
      subsidiary = await prisma.subsidiary.create({
        data: {
          organizationId,
          name,
          code,
          country: country || "US",
          currency: currency || "USD",
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: subsidiaryId ? "subsidiary.update" : "subsidiary.create",
        resource: "subsidiary",
        resourceId: subsidiary.id,
        details: { name, code },
      },
    });

    return NextResponse.json({ data: subsidiary });
  } catch (error) {
    console.error("Subsidiary POST error:", error);
    return NextResponse.json(
      { error: "Failed to save subsidiary" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/organization
 * Update organization settings: name, slug, logoUrl, primaryColor.
 * Requires SUPER_ADMIN or CFO role.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, logoUrl, primaryColor } = body;

    const organizationId = await resolveOrganizationId(
      session.user.id,
      body.organizationId ?? null
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Verify user is SUPER_ADMIN or CFO in this org
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

    // Build update data with only provided fields
    const updateData: Record<string, string> = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // If slug is being changed, check uniqueness
    if (slug) {
      const existing = await prisma.organization.findUnique({
        where: { slug },
      });
      if (existing && existing.id !== organizationId) {
        return NextResponse.json(
          { error: "Slug is already taken" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "organization.update",
        resource: "organization",
        resourceId: organizationId,
        details: { updatedFields: Object.keys(updateData) },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Organization PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}
