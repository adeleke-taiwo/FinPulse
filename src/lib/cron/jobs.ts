import { prisma } from "@/lib/db";
import { v4 as uuid } from "uuid";

// ── Crypto Price Fetch (every 15 min) ──
// Note: ts_crypto_prices table was removed (legacy TimescaleDB hypertable).
// This function is a no-op placeholder for future integration.
export async function fetchCryptoPrices() {
  console.log("[CRON] Crypto price fetch skipped (table not provisioned)");
}

// ── Anomaly Scan (every 30 min) ──
export async function scanAnomalies() {
  try {
    // Z-score based detection on recent transactions
    const anomalies = await prisma.$queryRawUnsafe<
      { id: string; amount: number; z_score: number }[]
    >(
      `WITH stats AS (
        SELECT AVG(amount) AS mean, STDDEV(amount) AS stddev
        FROM transactions WHERE status = 'COMPLETED'
      )
      SELECT t.id, t.amount::float, ABS((t.amount - s.mean) / NULLIF(s.stddev, 0))::float AS z_score
      FROM transactions t
      CROSS JOIN stats s
      WHERE t."createdAt" >= NOW() - INTERVAL '30 minutes'
        AND t.status = 'COMPLETED'
        AND ABS((t.amount - s.mean) / NULLIF(s.stddev, 0)) > 3
        AND NOT EXISTS (SELECT 1 FROM risk_flags rf WHERE rf."transactionId" = t.id)`
    );

    for (const a of anomalies) {
      const severity = a.z_score > 5 ? "CRITICAL" : a.z_score > 4 ? "HIGH" : "MEDIUM";
      await prisma.riskFlag.create({
        data: {
          transactionId: a.id,
          severity,
          ruleTriggered: "z_score_anomaly",
          riskScore: Math.min(a.z_score * 20, 99),
          details: { zScore: a.z_score, amount: a.amount },
        },
      });
    }

    console.log(`[CRON] Anomaly scan: ${anomalies.length} new flags`);
  } catch (error) {
    console.error("[CRON] Anomaly scan failed:", error);
  }
}

// ── Refresh Continuous Aggregates (hourly) ──
// Note: Materialized views ts_tx_hourly/ts_tx_daily were legacy TimescaleDB artifacts.
export async function refreshAggregates() {
  console.log("[CRON] Aggregate refresh skipped (materialized views not provisioned)");
}

// ── Daily Aggregation (1 AM) ──
// Note: fact_transactions and dimension tables were legacy data warehouse artifacts.
export async function dailyAggregation() {
  console.log("[CRON] Daily aggregation skipped (fact tables not provisioned)");
}

// ── GitHub Activity Sync (every 6 hours) ──
// Note: ts_github_activity table was a legacy TimescaleDB artifact.
export async function syncGitHubActivity() {
  console.log("[CRON] GitHub activity sync skipped (table not provisioned)");
}

// ── Monthly KPI Snapshot (1st of month, 2 AM) ──
// Note: fact_monthly_kpi table was a legacy data warehouse artifact.
export async function monthlyKPISnapshot() {
  console.log("[CRON] Monthly KPI snapshot skipped (fact tables not provisioned)");
}

// ── Simulated Transaction Generator (every 2–4 hours) ──
// Keeps the dashboard alive with fresh data for demo purposes.
// Generates 3-8 corporate transactions per run (~15-30/day at 4h interval).
export async function generateSimulatedTransactions() {
  try {
    // Fetch random accounts and categories
    const accounts = await prisma.account.findMany({ select: { id: true }, take: 50 });
    const categories = await prisma.category.findMany({
      where: { parentId: { not: null } },
      select: { id: true, slug: true },
    });

    if (accounts.length === 0 || categories.length === 0) return;

    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const rand = (min: number, max: number) => Math.random() * (max - min) + min;
    const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

    const incomeCategories = categories.filter((c) =>
      ["service-revenue", "product-revenue", "interest-income"].includes(c.slug)
    );
    const expenseCategories = categories.filter(
      (c) => !["service-revenue", "product-revenue", "interest-income"].includes(c.slug)
    );

    const count = randInt(3, 8);
    const now = new Date();
    let created = 0;

    for (let i = 0; i < count; i++) {
      const fromAccount = pick(accounts);
      const roll = Math.random();
      let type: "CREDIT" | "DEBIT" | "TRANSFER" | "FEE" | "INTEREST" | "REFUND";
      let category;
      let amount: number;
      let toAccountId: string | null = null;
      let description: string;

      if (roll < 0.15) {
        type = "CREDIT";
        category = incomeCategories.length > 0 ? pick(incomeCategories) : pick(categories);
        amount = rand(500, 25000);
        description = pick(["Client payment received", "Service invoice settled", "Product license renewal", "Subscription revenue"]);
      } else if (roll < 0.70) {
        type = "DEBIT";
        category = expenseCategories.length > 0 ? pick(expenseCategories) : pick(categories);
        const slug = category.slug;
        if (slug === "payroll-benefits") { amount = rand(3000, 15000); description = "Payroll disbursement"; }
        else if (slug === "office-facilities") { amount = rand(500, 8000); description = "Office lease payment"; }
        else if (slug === "technology-software") { amount = rand(200, 5000); description = "Software subscription"; }
        else if (slug === "legal-compliance") { amount = rand(1000, 10000); description = "Legal retainer fee"; }
        else if (slug === "business-travel") { amount = rand(200, 3000); description = "Business travel expense"; }
        else if (slug === "marketing-advertising") { amount = rand(500, 8000); description = "Marketing campaign spend"; }
        else { amount = rand(50, 2000); description = "Vendor payment"; }
      } else if (roll < 0.82) {
        type = "TRANSFER";
        category = pick(categories);
        const otherAccounts = accounts.filter((a) => a.id !== fromAccount.id);
        toAccountId = otherAccounts.length > 0 ? pick(otherAccounts).id : null;
        amount = rand(1000, 50000);
        description = pick(["Inter-department transfer", "Operating account rebalance", "Reserve fund allocation"]);
      } else if (roll < 0.92) {
        type = "INTEREST";
        category = incomeCategories.length > 0 ? pick(incomeCategories) : pick(categories);
        amount = rand(5, 500);
        description = "Interest earned on deposit";
      } else if (roll < 0.97) {
        type = "FEE";
        category = expenseCategories.length > 0 ? pick(expenseCategories) : pick(categories);
        amount = rand(5, 150);
        description = pick(["Wire transfer fee", "ACH processing fee", "Account maintenance fee"]);
      } else {
        type = "REFUND";
        category = expenseCategories.length > 0 ? pick(expenseCategories) : pick(categories);
        amount = rand(100, 3000);
        description = pick(["Client overpayment refund", "Vendor credit applied", "Duplicate payment reversal"]);
      }

      // ~3% chance of anomalous high-value transaction
      const isAnomaly = Math.random() < 0.03;
      if (isAnomaly) amount = rand(8000, 50000);

      const occurredAt = new Date(now.getTime() - randInt(0, 180) * 60 * 1000); // spread within last 3 hours
      const txId = uuid();

      await prisma.transaction.create({
        data: {
          id: txId,
          fromAccountId: fromAccount.id,
          toAccountId,
          categoryId: category.id,
          type,
          status: "COMPLETED",
          amount: parseFloat(amount.toFixed(2)),
          description,
          occurredAt,
          metadata: isAnomaly ? { flagReason: "high_amount" } : {},
        },
      });

      created++;
    }

    console.log(`[CRON] Simulated ${created} transactions at ${now.toISOString()}`);
  } catch (error) {
    console.error("[CRON] Transaction simulation failed:", error);
  }
}

// ── Vendor Fraud Scan (daily) ──
export async function vendorFraudScan() {
  try {
    // Check for duplicate bank accounts across vendors
    const duplicateBankAccounts = await prisma.$queryRawUnsafe<
      { bank_details: string; vendor_count: number }[]
    >(`
      SELECT "bankDetails"::text AS bank_details, COUNT(*) AS vendor_count
      FROM vendors
      WHERE "bankDetails" IS NOT NULL AND "isActive" = true
      GROUP BY "bankDetails"::text
      HAVING COUNT(*) > 1
    `);

    // Check for invoices just under approval threshold
    const suspiciousInvoices = await prisma.$queryRawUnsafe<
      { vendor_id: string; invoice_count: number; avg_amount: number }[]
    >(`
      SELECT "vendorId" AS vendor_id, COUNT(*) AS invoice_count, AVG(amount)::float AS avg_amount
      FROM invoices
      WHERE amount BETWEEN 4500 AND 5000
        AND "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY "vendorId"
      HAVING COUNT(*) >= 3
    `);

    console.log(`[CRON] Vendor fraud scan: ${duplicateBankAccounts.length} duplicate bank accounts, ${suspiciousInvoices.length} suspicious invoice patterns`);
  } catch (error) {
    console.error("[CRON] Vendor fraud scan failed:", error);
  }
}

// ── Budget Overrun Detection (daily) ──
export async function budgetOverrunDetection() {
  try {
    const overruns = await prisma.$queryRawUnsafe<
      { department_name: string; utilization: number }[]
    >(`
      SELECT d.name AS department_name,
        CASE WHEN b."totalAmount" > 0
          THEN (SUM(bli."actualAmount") / b."totalAmount" * 100)::float
          ELSE 0
        END AS utilization
      FROM budgets b
      JOIN departments d ON d.id = b."departmentId"
      JOIN budget_line_items bli ON bli."budgetId" = b.id
      WHERE b.status = 'ACTIVE'
      GROUP BY d.name, b."totalAmount"
      HAVING SUM(bli."actualAmount") / NULLIF(b."totalAmount", 0) > 0.9
    `);

    console.log(`[CRON] Budget overrun detection: ${overruns.length} departments at >90% utilization`);
  } catch (error) {
    console.error("[CRON] Budget overrun detection failed:", error);
  }
}

// ── Approval Bypass Detection (daily) ──
export async function approvalBypassDetection() {
  try {
    const bypassed = await prisma.$queryRawUnsafe<{ count: number }[]>(`
      SELECT COUNT(*)::int AS count
      FROM journal_entries
      WHERE status = 'POSTED'
        AND "approvedById" IS NULL
        AND "createdAt" >= NOW() - INTERVAL '7 days'
    `);

    const count = bypassed[0]?.count || 0;
    if (count > 0) {
      console.log(`[CRON] Approval bypass detection: ${count} journal entries posted without approval`);
    }
  } catch (error) {
    console.error("[CRON] Approval bypass detection failed:", error);
  }
}
