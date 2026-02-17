import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";
import { getTrialBalance } from "@/lib/finance/gl-engine";

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

    const asOfDate = searchParams.get("asOfDate");

    const rows = await getTrialBalance(
      organizationId,
      asOfDate ? new Date(asOfDate) : undefined
    );

    const totalDebits = rows.reduce((sum, r) => sum + r.debitBalance, 0);
    const totalCredits = rows.reduce((sum, r) => sum + r.creditBalance, 0);

    return NextResponse.json({
      data: rows,
      summary: {
        totalDebits: Math.round(totalDebits * 100) / 100,
        totalCredits: Math.round(totalCredits * 100) / 100,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      },
      asOfDate: asOfDate || new Date().toISOString().slice(0, 10),
    });
  } catch (error) {
    console.error("Trial balance API error:", error);
    return NextResponse.json(
      { error: "Failed to generate trial balance" },
      { status: 500 }
    );
  }
}
