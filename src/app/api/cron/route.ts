import { NextRequest, NextResponse } from "next/server";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";
import {
  fetchCryptoPrices,
  scanAnomalies,
  refreshAggregates,
  dailyAggregation,
  syncGitHubActivity,
  monthlyKPISnapshot,
  generateSimulatedTransactions,
  vendorFraudScan,
  budgetOverrunDetection,
  approvalBypassDetection,
} from "@/lib/cron/jobs";
import { backfillRecentTransactions } from "@/lib/cron/backfill";

const JOBS: Record<string, () => Promise<void>> = {
  crypto: fetchCryptoPrices,
  anomalies: scanAnomalies,
  aggregates: refreshAggregates,
  daily: dailyAggregation,
  github: syncGitHubActivity,
  kpi: monthlyKPISnapshot,
  simulate: generateSimulatedTransactions,
  backfill: async () => { await backfillRecentTransactions(30, 8); },
  "vendor-fraud": vendorFraudScan,
  "budget-overrun": budgetOverrunDetection,
  "approval-bypass": approvalBypassDetection,
};

export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePermission("admin", "delete");
    if (isAuthError(authResult)) return authResult;

    const { job } = await request.json();
    const jobFn = JOBS[job];

    if (!jobFn) {
      return NextResponse.json(
        { error: `Unknown job: ${job}. Available: ${Object.keys(JOBS).join(", ")}` },
        { status: 400 }
      );
    }

    await jobFn();

    return NextResponse.json({ success: true, job, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("CRON trigger error:", error);
    return NextResponse.json({ error: "Job execution failed" }, { status: 500 });
  }
}
