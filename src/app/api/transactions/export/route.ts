import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requirePermission("transactions", "view");
    if (isAuthError(authResult)) return authResult;

    const { searchParams } = request.nextUrl;
    const format = searchParams.get("format") || "csv";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (from || to) {
      where.occurredAt = {};
      if (from) (where.occurredAt as Record<string, Date>).gte = new Date(from);
      if (to) (where.occurredAt as Record<string, Date>).lte = new Date(to);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: 10000,
      include: {
        category: { select: { name: true } },
        fromAccount: { select: { accountNumber: true, type: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: authResult.userId,
        action: "transaction.export",
        resource: "transaction",
        details: { format, count: transactions.length },
      },
    });

    if (format === "csv") {
      const header = "ID,Date,Type,Status,Amount,Category,Account\n";
      const rows = transactions
        .map(
          (tx) =>
            `${tx.id},${tx.occurredAt.toISOString()},${tx.type},${tx.status},${tx.amount},"${tx.category?.name || ""}",***${tx.fromAccount?.accountNumber?.slice(-4) || ""}`
        )
        .join("\n");

      return new Response(header + rows, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="transactions_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // PDF: return JSON for client-side generation
    return NextResponse.json({
      data: transactions.map((tx) => ({
        id: tx.id,
        date: tx.occurredAt.toISOString(),
        type: tx.type,
        status: tx.status,
        amount: Number(tx.amount),
        category: tx.category?.name || "",
        account: `***${tx.fromAccount?.accountNumber?.slice(-4) || ""}`,
      })),
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export transactions" },
      { status: 500 }
    );
  }
}
