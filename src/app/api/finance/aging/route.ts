import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";
import { getAPAgingReport, getARAgingReport } from "@/lib/finance/aging";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type");
    const organizationId = await resolveOrganizationId(
      session.user.id,
      searchParams.get("organizationId")
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json(
        { error: "type is required" },
        { status: 400 }
      );
    }

    if (type !== "ap" && type !== "ar") {
      return NextResponse.json(
        { error: "type must be 'ap' or 'ar'" },
        { status: 400 }
      );
    }

    const report =
      type === "ap"
        ? await getAPAgingReport(organizationId)
        : await getARAgingReport(organizationId);

    return NextResponse.json({ type, data: report });
  } catch (error) {
    console.error("Aging report API error:", error);
    return NextResponse.json(
      { error: "Failed to generate aging report" },
      { status: 500 }
    );
  }
}
