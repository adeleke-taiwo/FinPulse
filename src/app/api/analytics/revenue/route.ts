import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requirePermission("analytics", "view");
    if (isAuthError(authResult)) return authResult;
    const { searchParams } = request.nextUrl;
    const from = searchParams.get("from") || "2024-01-01";
    const to = searchParams.get("to") || new Date().toISOString().split("T")[0];
    const granularity = searchParams.get("granularity") || "daily";

    let groupExpr: string;
    let dateFormat: string;
    switch (granularity) {
      case "weekly":
        groupExpr = "DATE_TRUNC('week', t.\"occurredAt\")";
        dateFormat = "YYYY-\"W\"IW";
        break;
      case "monthly":
        groupExpr = "DATE_TRUNC('month', t.\"occurredAt\")";
        dateFormat = "YYYY-MM";
        break;
      default:
        groupExpr = "DATE(t.\"occurredAt\")";
        dateFormat = "YYYY-MM-DD";
    }

    const timeSeries = await prisma.$queryRawUnsafe<
      { date: string; revenue: number; expenses: number; net: number }[]
    >(
      `SELECT
        TO_CHAR(${groupExpr}, '${dateFormat}') AS date,
        COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0)::float AS revenue,
        COALESCE(SUM(CASE WHEN t.type = 'DEBIT' THEN t.amount ELSE 0 END), 0)::float AS expenses,
        COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE -t.amount END), 0)::float AS net
       FROM transactions t
       WHERE t.status = 'COMPLETED'
         AND t."occurredAt" >= $1::date AND t."occurredAt" <= $2::date
       GROUP BY ${groupExpr}
       ORDER BY ${groupExpr}`,
      from,
      to
    );

    // Cash flow area chart data
    let cumulative = 0;
    const cashFlow = timeSeries.map((d) => {
      cumulative += d.net;
      return { date: d.date, cashFlow: cumulative, net: d.net };
    });

    // Revenue by category
    const byCategory = await prisma.$queryRawUnsafe<
      { name: string; color: string; total: number }[]
    >(
      `SELECT
        c.name,
        COALESCE(c.color, '#6366f1') AS color,
        SUM(t.amount)::float AS total
       FROM transactions t
       JOIN categories c ON t."categoryId" = c.id
       WHERE t.status = 'COMPLETED' AND t.type = 'CREDIT'
         AND t."occurredAt" >= $1::date AND t."occurredAt" <= $2::date
       GROUP BY c.name, c.color
       ORDER BY total DESC
       LIMIT 10`,
      from,
      to
    );

    return NextResponse.json({ timeSeries, cashFlow, byCategory });
  } catch (error) {
    console.error("Revenue API error:", error);
    return NextResponse.json({ error: "Failed to fetch revenue data" }, { status: 500 });
  }
}
