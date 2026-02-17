import type { TrialBalanceRow } from "@/lib/finance/gl-engine";

export interface FinancialRatios {
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  returnOnEquity: number;
  profitMargin: number;
  operatingMargin: number;
  assetTurnover: number;
  workingCapital: number;
}

export function calculateFinancialRatios(
  trialBalance: TrialBalanceRow[],
  revenue: number,
  netIncome: number
): FinancialRatios {
  // Aggregate by classification
  const totals = { ASSET: 0, LIABILITY: 0, EQUITY: 0, REVENUE: 0, EXPENSE: 0 };

  for (const row of trialBalance) {
    const balance =
      row.classification === "ASSET" || row.classification === "EXPENSE"
        ? row.debitBalance - row.creditBalance
        : row.creditBalance - row.debitBalance;
    totals[row.classification] += balance;
  }

  // Current assets = accounts starting with 10xx-13xx (simplified)
  const currentAssets = trialBalance
    .filter((r) => r.classification === "ASSET" && r.accountCode < "1400")
    .reduce((s, r) => s + (r.debitBalance - r.creditBalance), 0);

  // Current liabilities = accounts starting with 20xx-22xx
  const currentLiabilities = trialBalance
    .filter((r) => r.classification === "LIABILITY" && r.accountCode < "2300")
    .reduce((s, r) => s + (r.creditBalance - r.debitBalance), 0);

  // Quick assets = current assets minus inventory (13xx)
  const inventory = trialBalance
    .filter((r) => r.accountCode.startsWith("13"))
    .reduce((s, r) => s + (r.debitBalance - r.creditBalance), 0);

  const quickAssets = currentAssets - inventory;

  const totalAssets = Math.max(totals.ASSET, 1);
  const totalEquity = Math.max(totals.EQUITY, 1);
  const totalLiabilities = totals.LIABILITY;

  return {
    currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
    quickRatio: currentLiabilities > 0 ? quickAssets / currentLiabilities : 0,
    debtToEquity: totalEquity > 0 ? totalLiabilities / totalEquity : 0,
    returnOnEquity: totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0,
    profitMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0,
    operatingMargin: revenue > 0 ? ((revenue - totals.EXPENSE) / revenue) * 100 : 0,
    assetTurnover: totalAssets > 0 ? revenue / totalAssets : 0,
    workingCapital: currentAssets - currentLiabilities,
  };
}
