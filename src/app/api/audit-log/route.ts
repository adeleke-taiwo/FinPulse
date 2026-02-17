import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requirePermission("audit", "view");
    if (isAuthError(authResult)) return authResult;
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const action = searchParams.get("action");
    const resource = searchParams.get("resource");

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (resource) where.resource = resource;

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          actor: { select: { firstName: true, lastName: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
