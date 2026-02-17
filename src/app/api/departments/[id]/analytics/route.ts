import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";
import { getDepartmentKPIs } from "@/lib/finance/budget-analysis";

/**
 * GET /api/departments/[id]/analytics
 * Fetch KPIs for a specific department.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: departmentId } = await params;
    const { searchParams } = request.nextUrl;
    const organizationId = await resolveOrganizationId(
      session.user.id,
      searchParams.get("organizationId")
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const kpis = await getDepartmentKPIs(organizationId, departmentId);

    return NextResponse.json({ data: kpis });
  } catch (error) {
    console.error("Department analytics error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch department analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
