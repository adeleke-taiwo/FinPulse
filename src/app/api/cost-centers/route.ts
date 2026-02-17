import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";

/**
 * GET /api/cost-centers
 * Returns a list of cost centers (id, name, departmentId) for dropdown usage.
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

    const where: Record<string, unknown> = {
      department: { organizationId },
    };
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const costCenters = await prisma.costCenter.findMany({
      where,
      select: { id: true, name: true, departmentId: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(costCenters);
  } catch (error) {
    console.error("Cost centers API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost centers" },
      { status: 500 }
    );
  }
}
