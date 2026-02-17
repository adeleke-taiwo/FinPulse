import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission("transactions", "view");
    if (isAuthError(authResult)) return authResult;

    const { id } = await params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        fromAccount: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        toAccount: { select: { accountNumber: true, type: true } },
        riskFlags: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...transaction,
      amount: Number(transaction.amount),
      riskFlags: transaction.riskFlags.map((rf) => ({
        ...rf,
        riskScore: Number(rf.riskScore),
      })),
    });
  } catch (error) {
    console.error("Transaction detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction" },
      { status: 500 }
    );
  }
}
