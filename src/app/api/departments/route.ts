import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";

/**
 * GET /api/departments
 * Returns a simple list of departments (id, name) for dropdown usage.
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

    const departments = await prisma.department.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error("Departments API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}
