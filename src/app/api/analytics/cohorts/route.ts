import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";

export async function GET(_request: NextRequest) {
  try {
    const authResult = await requirePermission("analytics", "view");
    if (isAuthError(authResult)) return authResult;
    // Cohort retention: group users by their first transaction month,
    // then track how many were active in subsequent months
    const cohortData = await prisma.$queryRawUnsafe<
      { cohort: string; period: number; users: number; total: number; retention: number }[]
    >(
      `WITH user_first_tx AS (
        SELECT
          a."userId" AS user_id,
          DATE_TRUNC('month', MIN(t."occurredAt")) AS first_month
        FROM transactions t
        JOIN accounts a ON t."fromAccountId" = a.id
        GROUP BY a."userId"
      ),
      monthly_activity AS (
        SELECT
          a."userId" AS user_id,
          DATE_TRUNC('month', t."occurredAt") AS active_month
        FROM transactions t
        JOIN accounts a ON t."fromAccountId" = a.id
        GROUP BY a."userId", DATE_TRUNC('month', t."occurredAt")
      ),
      cohort_sizes AS (
        SELECT first_month AS cohort, COUNT(*) AS total
        FROM user_first_tx
        GROUP BY first_month
      ),
      retention AS (
        SELECT
          uft.first_month AS cohort,
          EXTRACT(MONTH FROM AGE(ma.active_month, uft.first_month))::int AS period,
          COUNT(DISTINCT ma.user_id) AS users
        FROM user_first_tx uft
        JOIN monthly_activity ma ON ma.user_id = uft.user_id
        WHERE ma.active_month >= uft.first_month
        GROUP BY uft.first_month, EXTRACT(MONTH FROM AGE(ma.active_month, uft.first_month))
      )
      SELECT
        TO_CHAR(r.cohort, 'YYYY-MM') AS cohort,
        r.period,
        r.users::int,
        cs.total::int,
        ROUND((r.users::numeric / cs.total::numeric) * 100, 1)::float AS retention
      FROM retention r
      JOIN cohort_sizes cs ON cs.cohort = r.cohort
      WHERE r.period <= 11
      ORDER BY r.cohort, r.period`
    );

    // Churn rate by month (calculated from transactions, not legacy fact table)
    const churnData = await prisma.$queryRawUnsafe<
      { month: string; churn_rate: number }[]
    >(
      `WITH monthly_users AS (
        SELECT
          DATE_TRUNC('month', t."occurredAt") AS month,
          COUNT(DISTINCT a."userId") AS users
        FROM transactions t
        JOIN accounts a ON t."fromAccountId" = a.id
        WHERE t.status = 'COMPLETED'
        GROUP BY DATE_TRUNC('month', t."occurredAt")
        ORDER BY month
      )
      SELECT
        TO_CHAR(m.month, 'YYYY-MM') AS month,
        CASE WHEN LAG(m.users) OVER (ORDER BY m.month) > 0
          THEN ROUND((1.0 - m.users::numeric / LAG(m.users) OVER (ORDER BY m.month)::numeric) * 100, 2)::float
          ELSE 0::float
        END AS churn_rate
      FROM monthly_users m`
    );

    return NextResponse.json({ cohortData, churnData });
  } catch (error) {
    console.error("Cohorts API error:", error);
    return NextResponse.json({ error: "Failed to fetch cohort data" }, { status: 500 });
  }
}
