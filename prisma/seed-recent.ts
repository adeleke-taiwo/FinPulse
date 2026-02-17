import { PrismaClient, TransactionType, TransactionStatus } from "@prisma/client";
import { v4 as uuid } from "uuid";

const prisma = new PrismaClient();

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function formatDateKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

async function main() {
  console.log("=== Generating recent data (Jan 1 – Feb 15, 2026) ===\n");

  // ── Fetch existing data ──
  const accounts = await prisma.account.findMany({ select: { id: true, userId: true, type: true } });
  const categories = await prisma.category.findMany({ where: { parentId: { not: null } }, select: { id: true, slug: true } });

  const incomeCategories = categories.filter((c) => ["salary", "consulting-revenue", "investment-returns"].includes(c.slug));
  const expenseCategories = categories.filter((c) => !["salary", "consulting-revenue", "investment-returns"].includes(c.slug));

  const checkingAccounts = accounts.filter((a) => a.type === "CHECKING");
  const savingsAccounts = accounts.filter((a) => a.type === "SAVINGS");
  const investmentAccounts = accounts.filter((a) => a.type === "INVESTMENT");
  const allAccounts = accounts;

  // ── 1. Generate Transactions (Jan 1 – Feb 15, 2026) ──
  const existingRecent = await prisma.transaction.count({
    where: { occurredAt: { gte: new Date("2026-01-01T00:00:00Z") } },
  });
  const skipTxGeneration = existingRecent > 0;
  if (skipTxGeneration) {
    console.log(`[1/3] Skipping transactions (${existingRecent} already exist for 2026)`);
  } else {
    console.log("[1/3] Generating transactions...");
  }

  const startDate = new Date("2026-01-01T00:00:00Z");
  const endDate = new Date("2026-02-15T23:59:59Z");
  const txBatch: {
    id: string;
    fromAccountId: string;
    toAccountId: string | null;
    categoryId: string;
    type: TransactionType;
    status: TransactionStatus;
    amount: any;
    description: string;
    occurredAt: Date;
    metadata: any;
  }[] = [];

  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayOfMonth = current.getDate();

    // More transactions on weekdays, salary spikes on 1st/15th
    let txCountBase = isWeekend ? randInt(12, 20) : randInt(18, 30);
    if (dayOfMonth === 1 || dayOfMonth === 15) txCountBase += randInt(8, 15);

    for (let i = 0; i < txCountBase; i++) {
      const hour = randInt(6, 23);
      const minute = randInt(0, 59);
      const occurredAt = new Date(current);
      occurredAt.setHours(hour, minute, randInt(0, 59), 0);

      const fromAccount = pick(allAccounts);
      let toAccount: (typeof allAccounts)[0] | null = null;
      let type: TransactionType;
      let category: (typeof categories)[0];
      let amount: number;
      let description: string;

      const roll = Math.random();

      if (roll < 0.15) {
        // CREDIT — income
        type = "CREDIT";
        category = pick(incomeCategories);
        if (category.slug === "salary" && (dayOfMonth === 1 || dayOfMonth === 15)) {
          amount = rand(3500, 8500);
        } else if (category.slug === "consulting-revenue") {
          amount = rand(200, 3000);
        } else {
          amount = rand(50, 2000);
        }
        description = `Income: ${category.slug}`;
      } else if (roll < 0.70) {
        // DEBIT — expenses
        type = "DEBIT";
        category = pick(expenseCategories);
        const slug = category.slug;
        if (["rent", "mortgage"].includes(slug)) amount = rand(800, 2500);
        else if (slug === "utilities") amount = rand(50, 300);
        else if (slug === "groceries") amount = rand(20, 200);
        else if (slug === "restaurants") amount = rand(10, 120);
        else if (["clothing", "electronics"].includes(slug)) amount = rand(30, 500);
        else if (slug === "gas") amount = rand(25, 80);
        else amount = rand(5, 400);
        description = `Purchase: ${category.slug}`;
      } else if (roll < 0.82) {
        // TRANSFER
        type = "TRANSFER";
        category = pick(categories);
        toAccount = pick(allAccounts.filter((a) => a.id !== fromAccount.id));
        amount = rand(100, 5000);
        description = "Internal transfer";
      } else if (roll < 0.90) {
        // INTEREST
        type = "INTEREST";
        category = pick(incomeCategories);
        amount = rand(0.5, 50);
        description = "Interest earned";
      } else if (roll < 0.96) {
        // FEE
        type = "FEE";
        category = pick(expenseCategories);
        amount = rand(1, 35);
        description = "Service fee";
      } else {
        // REFUND
        type = "REFUND";
        category = pick(expenseCategories);
        amount = rand(10, 300);
        description = "Refund processed";
      }

      // 92% completed, 4% pending, 2% failed, 2% reversed
      const statusRoll = Math.random();
      const status: TransactionStatus =
        statusRoll < 0.92 ? "COMPLETED" : statusRoll < 0.96 ? "PENDING" : statusRoll < 0.98 ? "FAILED" : "REVERSED";

      // ~3% anomalous (large amounts)
      const isAnomaly = Math.random() < 0.03;
      if (isAnomaly) {
        amount = rand(8000, 50000);
      }

      txBatch.push({
        id: uuid(),
        fromAccountId: fromAccount.id,
        toAccountId: toAccount?.id || null,
        categoryId: category.id,
        type,
        status,
        amount: parseFloat(amount.toFixed(2)),
        description,
        occurredAt,
        metadata: isAnomaly ? { flagReason: "high_amount" } : {},
      });
    }

    current.setDate(current.getDate() + 1);
  }

  // Batch insert transactions
  const CHUNK = 500;
  if (!skipTxGeneration) {
    for (let i = 0; i < txBatch.length; i += CHUNK) {
      const chunk = txBatch.slice(i, i + CHUNK);
      await prisma.transaction.createMany({ data: chunk });
    }
    console.log(`   ✓ ${txBatch.length} transactions created`);

    // ── 2. Generate risk flags for anomalous transactions ──
    console.log("[2/3] Creating risk flags for anomalies...");
    const anomalousIds = txBatch.filter((t) => t.amount > 8000 && t.status === "COMPLETED").map((t) => t.id);
    let flagCount = 0;
    for (const txId of anomalousIds) {
      const tx = txBatch.find((t) => t.id === txId)!;
      const zScore = rand(3.1, 7.5);
      const severity = zScore > 5 ? "CRITICAL" : zScore > 4 ? "HIGH" : "MEDIUM";
      await prisma.riskFlag.create({
        data: {
          transactionId: txId,
          severity,
          status: pick(["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"]),
          ruleTriggered: "z_score_anomaly",
          riskScore: Math.min(zScore * 20, 99),
          details: { zScore: parseFloat(zScore.toFixed(2)), amount: tx.amount },
        },
      });
      flagCount++;
    }
    console.log(`   ✓ ${flagCount} risk flags created`);
  } else {
    console.log("[2/3] Skipping risk flags (transactions already existed)");
  }

  // Legacy tables (ts_transaction_metrics, ts_crypto_prices, ts_github_activity,
  // fact_transactions, fact_monthly_kpi, dim_*) are no longer used.
  // Dashboard and analytics now query the transactions table directly.

  console.log("[3/3] Done!");
  console.log("\n=== Done! All recent data generated. ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
