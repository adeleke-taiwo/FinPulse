import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";
import {
  generateIncomeStatement,
  generateBalanceSheet,
  generateCashFlowStatement,
} from "@/lib/finance/statements";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
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

    const validTypes = ["income", "balance", "cashflow"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (type === "income" || type === "cashflow") {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: "startDate and endDate are required for this statement type" },
          { status: 400 }
        );
      }
    }

    if (type === "balance" && !endDate) {
      return NextResponse.json(
        { error: "endDate is required for balance sheet" },
        { status: 400 }
      );
    }

    let statement;

    switch (type) {
      case "income":
        statement = await generateIncomeStatement(
          organizationId,
          new Date(startDate!),
          new Date(endDate!)
        );
        break;
      case "balance":
        statement = await generateBalanceSheet(
          organizationId,
          new Date(endDate!)
        );
        break;
      case "cashflow":
        statement = await generateCashFlowStatement(
          organizationId,
          new Date(startDate!),
          new Date(endDate!)
        );
        break;
    }

    return NextResponse.json({ type, data: statement });
  } catch (error) {
    console.error("Financial statements API error:", error);
    return NextResponse.json(
      { error: "Failed to generate financial statement" },
      { status: 500 }
    );
  }
}
