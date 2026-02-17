import { prisma } from "@/lib/db";
import { v4 as uuid } from "uuid";
import type { TransactionType, TransactionStatus } from "@prisma/client";

/**
 * Ensures transactions exist for every day in the last N days.
 * Called lazily from the dashboard API so the dashboard never shows empty data.
 * Skips days that already have >= minPerDay transactions.
 */
export async function backfillRecentTransactions(days = 30, minPerDay = 8) {
  try {
    const accounts = await prisma.account.findMany({ select: { id: true }, take: 50 });
    const categories = await prisma.category.findMany({
      where: { parentId: { not: null } },
      select: { id: true, slug: true },
    });

    if (accounts.length === 0 || categories.length === 0) return 0;

    // Check which of the last N days are missing transactions
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 86400000);

    const dailyCounts = await prisma.$queryRawUnsafe<
      { day: string; count: number }[]
    >(
      `SELECT DATE("occurredAt")::text AS day, COUNT(*)::int AS count
       FROM transactions
       WHERE "occurredAt" >= $1
       GROUP BY DATE("occurredAt")`,
      startDate
    );

    const countMap = new Map(dailyCounts.map((r) => [r.day, r.count]));

    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const rand = (min: number, max: number) => Math.random() * (max - min) + min;
    const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

    const incomeCategories = categories.filter((c) =>
      ["service-revenue", "product-revenue", "interest-income"].includes(c.slug)
    );
    const expenseCategories = categories.filter(
      (c) => !["service-revenue", "product-revenue", "interest-income"].includes(c.slug)
    );

    const txTypes: TransactionType[] =
      ["CREDIT", "DEBIT", "DEBIT", "DEBIT", "TRANSFER", "FEE", "INTEREST", "REFUND"];

    const descriptions: Record<string, string[]> = {
      CREDIT: ["Client payment received", "Service invoice settled", "Product license renewal", "Subscription revenue", "Consulting fee received"],
      DEBIT: ["Vendor payment", "Payroll disbursement", "Software subscription", "Office lease payment", "Cloud hosting charges", "Legal retainer fee", "Marketing campaign spend", "Business travel expense"],
      TRANSFER: ["Inter-department transfer", "Operating account rebalance", "Reserve fund allocation"],
      FEE: ["Wire transfer fee", "ACH processing fee", "Account maintenance fee"],
      INTEREST: ["Interest earned on deposit"],
      REFUND: ["Client overpayment refund", "Vendor credit applied", "Duplicate payment reversal"],
    };

    const amountRanges: Record<string, [number, number]> = {
      CREDIT: [500, 25000],
      DEBIT: [50, 8000],
      TRANSFER: [1000, 50000],
      FEE: [5, 150],
      INTEREST: [5, 500],
      REFUND: [100, 3000],
    };

    let totalCreated = 0;
    const batch: {
      id: string;
      fromAccountId: string;
      toAccountId: string | null;
      categoryId: string;
      type: TransactionType;
      status: TransactionStatus;
      amount: number;
      description: string;
      occurredAt: Date;
    }[] = [];

    for (let d = 0; d < days; d++) {
      const day = new Date(now.getTime() - d * 86400000);
      const dayStr = day.toISOString().split("T")[0];
      const existing = countMap.get(dayStr) || 0;

      if (existing >= minPerDay) continue;

      const needed = minPerDay - existing + randInt(0, 4);

      for (let i = 0; i < needed; i++) {
        const type = pick(txTypes);
        const category = type === "CREDIT"
          ? (incomeCategories.length > 0 ? pick(incomeCategories) : pick(categories))
          : (expenseCategories.length > 0 ? pick(expenseCategories) : pick(categories));

        const [minAmt, maxAmt] = amountRanges[type];
        const amount = parseFloat(rand(minAmt, maxAmt).toFixed(2));
        const fromAccount = pick(accounts);
        const toAccountId = type === "TRANSFER"
          ? (accounts.filter((a) => a.id !== fromAccount.id)[0]?.id || null)
          : null;

        const hour = randInt(8, 18);
        const minute = randInt(0, 59);
        const occurredAt = new Date(day);
        occurredAt.setHours(hour, minute, randInt(0, 59), 0);

        batch.push({
          id: uuid(),
          fromAccountId: fromAccount.id,
          toAccountId,
          categoryId: category.id,
          type,
          status: pick(["COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "PENDING"] as TransactionStatus[]),
          amount,
          description: pick(descriptions[type]),
          occurredAt,
        });

        totalCreated++;
      }
    }

    if (batch.length > 0) {
      // Insert in chunks of 500
      for (let i = 0; i < batch.length; i += 500) {
        await prisma.transaction.createMany({ data: batch.slice(i, i + 500) });
      }
      console.log(`[BACKFILL] Created ${totalCreated} transactions across ${days} days`);
    }

    return totalCreated;
  } catch (error) {
    console.error("[BACKFILL] Failed:", error);
    return 0;
  }
}
