import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";
import { backfillRecentTransactions } from "@/lib/cron/backfill";

// Simple in-memory flag so backfill runs at most once per server restart / ~1 hour
let lastBackfillAt = 0;
const BACKFILL_INTERVAL = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  try {
    const authResult = await requirePermission("dashboard", "view");
    if (isAuthError(authResult)) return authResult;
    const { searchParams } = request.nextUrl;
    const from = searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString();
    const to = searchParams.get("to") || new Date().toISOString();

    const fromDate = new Date(from);
    const toDate = new Date(to);

    // Auto-backfill: ensure recent days have transaction data (runs at most once per hour)
    if (Date.now() - lastBackfillAt > BACKFILL_INTERVAL) {
      lastBackfillAt = Date.now();
      // Run in background — don't block the response
      backfillRecentTransactions(30, 8).catch(() => {});
    }

    // KPIs from transactions
    const kpiResult = await prisma.$queryRawUnsafe<
      { revenue: number; expenses: number; active_users: number }[]
    >(
      `SELECT
        COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0)::float AS revenue,
        COALESCE(SUM(CASE WHEN t.type = 'DEBIT' THEN t.amount ELSE 0 END), 0)::float AS expenses,
        COUNT(DISTINCT a."userId")::int AS active_users
       FROM transactions t
       LEFT JOIN accounts a ON t."fromAccountId" = a.id
       WHERE t."occurredAt" >= $1 AND t."occurredAt" <= $2 AND t.status = 'COMPLETED'`,
      fromDate,
      toDate
    );
    const kpis = kpiResult[0];

    // Previous period for comparison
    const periodLength = toDate.getTime() - fromDate.getTime();
    const prevFrom = new Date(fromDate.getTime() - periodLength);
    const prevTo = new Date(fromDate);

    const prevResult = await prisma.$queryRawUnsafe<
      { revenue: number; expenses: number; active_users: number }[]
    >(
      `SELECT
        COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0)::float AS revenue,
        COALESCE(SUM(CASE WHEN t.type = 'DEBIT' THEN t.amount ELSE 0 END), 0)::float AS expenses,
        COUNT(DISTINCT a."userId")::int AS active_users
       FROM transactions t
       LEFT JOIN accounts a ON t."fromAccountId" = a.id
       WHERE t."occurredAt" >= $1 AND t."occurredAt" < $2 AND t.status = 'COMPLETED'`,
      prevFrom,
      prevTo
    );
    const prevKpis = prevResult[0];

    // Revenue trend (daily)
    const revenueTrend = await prisma.$queryRawUnsafe<
      { date: string; revenue: number; expenses: number }[]
    >(
      `SELECT
        DATE(t."occurredAt")::text AS date,
        COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0)::float AS revenue,
        COALESCE(SUM(CASE WHEN t.type = 'DEBIT' THEN t.amount ELSE 0 END), 0)::float AS expenses
       FROM transactions t
       WHERE t."occurredAt" >= $1 AND t."occurredAt" <= $2 AND t.status = 'COMPLETED'
       GROUP BY DATE(t."occurredAt")
       ORDER BY DATE(t."occurredAt")`,
      fromDate,
      toDate
    );

    // Transaction volume by type
    const txVolume = await prisma.$queryRawUnsafe<
      { type: string; count: number; total: number }[]
    >(
      `SELECT
        t.type,
        COUNT(*)::int AS count,
        COALESCE(SUM(t.amount), 0)::float AS total
       FROM transactions t
       WHERE t."occurredAt" >= $1 AND t."occurredAt" <= $2 AND t.status = 'COMPLETED'
       GROUP BY t.type
       ORDER BY count DESC`,
      fromDate,
      toDate
    );

    // Category breakdown
    const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#06b6d4", "#f97316"];
    const categoryBreakdown = await prisma.$queryRawUnsafe<
      { name: string; total: number; count: number }[]
    >(
      `SELECT
        c.name,
        COALESCE(SUM(t.amount), 0)::float AS total,
        COUNT(*)::int AS count
       FROM transactions t
       JOIN categories c ON t."categoryId" = c.id
       WHERE t."occurredAt" >= $1 AND t."occurredAt" <= $2 AND t.status = 'COMPLETED'
       GROUP BY c.name
       ORDER BY total DESC
       LIMIT 8`,
      fromDate,
      toDate
    );

    // Recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      take: 10,
      orderBy: { occurredAt: "desc" },
      distinct: ["id"],
      include: {
        category: true,
        fromAccount: { select: { accountNumber: true, type: true } },
        riskFlags: { select: { severity: true } },
      },
    });

    // KPI sparklines (last 12 months from transactions)
    const sparklines = await prisma.$queryRawUnsafe<
      { month: string; revenue: number; active_users: number; profit: number; growth_rate: number }[]
    >(
      `SELECT
        TO_CHAR(DATE_TRUNC('month', t."occurredAt"), 'YYYY-MM') AS month,
        COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0)::float AS revenue,
        COUNT(DISTINCT a."userId")::int AS active_users,
        (COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0)
         - COALESCE(SUM(CASE WHEN t.type = 'DEBIT' THEN t.amount ELSE 0 END), 0))::float AS profit,
        0::float AS growth_rate
       FROM transactions t
       LEFT JOIN accounts a ON t."fromAccountId" = a.id
       WHERE t.status = 'COMPLETED'
       GROUP BY DATE_TRUNC('month', t."occurredAt")
       ORDER BY DATE_TRUNC('month', t."occurredAt") DESC
       LIMIT 12`
    );

    function calcChange(current: number | null, previous: number | null): number {
      if (!previous || !current) return 0;
      return ((current - previous) / previous) * 100;
    }

    const revenue = kpis?.revenue || 0;
    const expenses = kpis?.expenses || 0;
    const cashFlow = revenue - expenses;
    const prevRevenue = prevKpis?.revenue || 0;
    const prevExpenses = prevKpis?.expenses || 0;
    const prevCashFlow = prevRevenue - prevExpenses;

    return NextResponse.json({
      kpis: {
        revenue,
        activeUsers: kpis?.active_users || 0,
        cashFlow,
        growthRate: calcChange(revenue, prevRevenue),
        changes: {
          revenue: calcChange(revenue, prevRevenue),
          activeUsers: calcChange(kpis?.active_users, prevKpis?.active_users),
          cashFlow: calcChange(cashFlow, prevCashFlow),
          growthRate: 0,
        },
        sparklines: sparklines.reverse(),
      },
      revenueTrend,
      txVolume,
      categoryBreakdown: categoryBreakdown.map((c, i) => ({
        ...c,
        color: COLORS[i % COLORS.length],
      })),
      recentTransactions: recentTransactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount: Number(tx.amount),
        description: tx.description,
        occurredAt: tx.occurredAt,
        category: tx.category?.name || "Uncategorized",
        accountNumber: tx.fromAccount?.accountNumber,
        hasRisk: tx.riskFlags.length > 0,
        riskSeverity: tx.riskFlags[0]?.severity,
      })),
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
