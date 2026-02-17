import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";

export async function GET(_request: NextRequest) {
  try {
    const authResult = await requirePermission("analytics", "view");
    if (isAuthError(authResult)) return authResult;
    // Z-score based anomaly detection on transaction amounts
    const anomalies = await prisma.$queryRawUnsafe<
      {
        id: string;
        amount: number;
        z_score: number;
        occurred_at: string;
        category: string;
        type: string;
        is_flagged: boolean;
      }[]
    >(
      `WITH stats AS (
        SELECT AVG(amount) AS mean, STDDEV(amount) AS stddev
        FROM transactions
        WHERE status = 'COMPLETED'
      )
      SELECT
        t.id,
        t.amount::float,
        ABS((t.amount - s.mean) / NULLIF(s.stddev, 0))::float AS z_score,
        t."occurredAt"::text AS occurred_at,
        COALESCE(c.name, 'Unknown') AS category,
        t.type,
        EXISTS(SELECT 1 FROM risk_flags rf WHERE rf."transactionId" = t.id) AS is_flagged
      FROM transactions t
      CROSS JOIN stats s
      LEFT JOIN categories c ON t."categoryId" = c.id
      WHERE t.status = 'COMPLETED'
        AND ABS((t.amount - s.mean) / NULLIF(s.stddev, 0)) > 1.5
      ORDER BY z_score DESC
      LIMIT 200`
    );

    // Flagged transactions summary
    const flaggedSummary = await prisma.$queryRawUnsafe<
      { severity: string; count: number }[]
    >(
      `SELECT severity, COUNT(*)::int AS count
       FROM risk_flags
       GROUP BY severity
       ORDER BY CASE severity
         WHEN 'CRITICAL' THEN 1
         WHEN 'HIGH' THEN 2
         WHEN 'MEDIUM' THEN 3
         WHEN 'LOW' THEN 4
       END`
    );

    // Anomaly trend (by month)
    const trend = await prisma.$queryRawUnsafe<
      { month: string; count: number; avg_score: number }[]
    >(
      `WITH stats AS (
        SELECT AVG(amount) AS mean, STDDEV(amount) AS stddev
        FROM transactions WHERE status = 'COMPLETED'
      )
      SELECT
        TO_CHAR(DATE_TRUNC('month', t."occurredAt"), 'YYYY-MM') AS month,
        COUNT(*)::int AS count,
        AVG(ABS((t.amount - s.mean) / NULLIF(s.stddev, 0)))::float AS avg_score
      FROM transactions t
      CROSS JOIN stats s
      WHERE t.status = 'COMPLETED'
        AND ABS((t.amount - s.mean) / NULLIF(s.stddev, 0)) > 2
      GROUP BY DATE_TRUNC('month', t."occurredAt")
      ORDER BY month`
    );

    return NextResponse.json({ anomalies, flaggedSummary, trend });
  } catch (error) {
    console.error("Anomalies API error:", error);
    return NextResponse.json({ error: "Failed to fetch anomaly data" }, { status: 500 });
  }
}
