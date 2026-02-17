import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";

export async function GET(_request: NextRequest) {
  try {
    const authResult = await requirePermission("analytics", "view");
    if (isAuthError(authResult)) return authResult;
    // KPIs from transactions table (replaces legacy fact_monthly_kpi)
    const kpis = await prisma.$queryRawUnsafe<
      {
        month: string;
        revenue: number;
        expenses: number;
        profit: number;
        active_users: number;
        arpu: number;
        growth_rate: number;
      }[]
    >(
      `SELECT
        TO_CHAR(DATE_TRUNC('month', t."occurredAt"), 'YYYY-MM') AS month,
        COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0)::float AS revenue,
        COALESCE(SUM(CASE WHEN t.type = 'DEBIT' THEN t.amount ELSE 0 END), 0)::float AS expenses,
        (COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0)
         - COALESCE(SUM(CASE WHEN t.type = 'DEBIT' THEN t.amount ELSE 0 END), 0))::float AS profit,
        COUNT(DISTINCT a."userId")::int AS active_users,
        CASE WHEN COUNT(DISTINCT a."userId") > 0
          THEN (COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0) / COUNT(DISTINCT a."userId"))::float
          ELSE 0
        END AS arpu,
        0::float AS growth_rate
       FROM transactions t
       LEFT JOIN accounts a ON t."fromAccountId" = a.id
       WHERE t.status = 'COMPLETED'
       GROUP BY DATE_TRUNC('month', t."occurredAt")
       ORDER BY DATE_TRUNC('month', t."occurredAt")`
    );

    // Latest values for cards
    const latest = kpis[kpis.length - 1];
    const prev = kpis.length >= 2 ? kpis[kpis.length - 2] : null;

    function calcChange(cur: number, prv: number | null): number {
      if (!prv || prv === 0) return 0;
      return ((cur - prv) / prv) * 100;
    }

    const ltv = (latest?.arpu || 0) * 18;
    const cac = 120;
    const profitMargin = latest?.revenue ? latest.profit / latest.revenue : 0;
    const retentionRate = 0.92;

    return NextResponse.json({
      series: kpis.map((k) => ({
        ...k,
        ltv: k.arpu * 18,
        cac: 120,
        retention_rate: 0.92,
        churn_rate: 0.08,
        profit_margin: k.revenue > 0 ? k.profit / k.revenue : 0,
      })),
      cards: {
        arpu: { value: latest?.arpu || 0, change: calcChange(latest?.arpu || 0, prev?.arpu || null) },
        ltv: { value: ltv, change: calcChange(ltv, prev ? prev.arpu * 18 : null) },
        cac: { value: cac, change: 0 },
        profitMargin: { value: profitMargin * 100, change: calcChange(profitMargin, prev?.revenue ? prev.profit / prev.revenue : null) },
        growthRate: { value: calcChange(latest?.revenue || 0, prev?.revenue || null), change: 0 },
        retentionRate: { value: retentionRate * 100, change: 0 },
      },
    });
  } catch (error) {
    console.error("KPIs API error:", error);
    return NextResponse.json({ error: "Failed to fetch KPI data" }, { status: 500 });
  }
}
