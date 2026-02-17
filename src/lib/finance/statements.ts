import { prisma } from "@/lib/db";

export interface StatementLine {
  accountCode: string;
  accountName: string;
  amount: number;
  isSubtotal?: boolean;
}

export interface IncomeStatement {
  period: string;
  revenue: StatementLine[];
  totalRevenue: number;
  expenses: StatementLine[];
  totalExpenses: number;
  netIncome: number;
}

export interface BalanceSheet {
  asOfDate: string;
  assets: StatementLine[];
  totalAssets: number;
  liabilities: StatementLine[];
  totalLiabilities: number;
  equity: StatementLine[];
  totalEquity: number;
}

export interface CashFlowStatement {
  period: string;
  operatingActivities: StatementLine[];
  totalOperating: number;
  investingActivities: StatementLine[];
  totalInvesting: number;
  financingActivities: StatementLine[];
  totalFinancing: number;
  netChange: number;
}

async function getPostedBalances(
  organizationId: string,
  classification: string,
  startDate?: Date,
  endDate?: Date
): Promise<StatementLine[]> {
  const dateFilters: string[] = [];
  if (startDate) dateFilters.push(`AND je."date" >= '${startDate.toISOString()}'`);
  if (endDate) dateFilters.push(`AND je."date" <= '${endDate.toISOString()}'`);

  const rows = await prisma.$queryRawUnsafe<
    { code: string; name: string; balance: number }[]
  >(`
    SELECT
      ga.code,
      ga.name,
      CASE
        WHEN ga."normalBalance" = 'DEBIT' THEN COALESCE(SUM(jl.debit) - SUM(jl.credit), 0)::float
        ELSE COALESCE(SUM(jl.credit) - SUM(jl.debit), 0)::float
      END AS balance
    FROM gl_accounts ga
    LEFT JOIN journal_lines jl ON jl."glAccountId" = ga.id
    LEFT JOIN journal_entries je ON je.id = jl."journalEntryId"
      AND je.status = 'POSTED'
      ${dateFilters.join(" ")}
    WHERE ga."organizationId" = '${organizationId}'
      AND ga.classification = '${classification}'
      AND ga."isActive" = true
      AND ga."parentId" IS NOT NULL
    GROUP BY ga.id, ga.code, ga.name, ga."normalBalance"
    HAVING COALESCE(SUM(jl.debit) - SUM(jl.credit), 0) != 0
        OR COALESCE(SUM(jl.credit) - SUM(jl.debit), 0) != 0
    ORDER BY ga.code
  `);

  return rows.map((r) => ({
    accountCode: r.code,
    accountName: r.name,
    amount: Math.abs(r.balance),
  }));
}

export async function generateIncomeStatement(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<IncomeStatement> {
  const revenue = await getPostedBalances(organizationId, "REVENUE", startDate, endDate);
  const expenses = await getPostedBalances(organizationId, "EXPENSE", startDate, endDate);

  const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = expenses.reduce((sum, r) => sum + r.amount, 0);

  return {
    period: `${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`,
    revenue,
    totalRevenue,
    expenses,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
  };
}

export async function generateBalanceSheet(
  organizationId: string,
  asOfDate: Date
): Promise<BalanceSheet> {
  const assets = await getPostedBalances(organizationId, "ASSET", undefined, asOfDate);
  const liabilities = await getPostedBalances(organizationId, "LIABILITY", undefined, asOfDate);
  const equity = await getPostedBalances(organizationId, "EQUITY", undefined, asOfDate);

  const totalAssets = assets.reduce((sum, r) => sum + r.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, r) => sum + r.amount, 0);
  const totalEquity = equity.reduce((sum, r) => sum + r.amount, 0);

  return {
    asOfDate: asOfDate.toISOString().slice(0, 10),
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    equity,
    totalEquity,
  };
}

export async function generateCashFlowStatement(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<CashFlowStatement> {
  // Indirect method: start with Net Income, adjust for non-cash items and working capital changes
  const dateFilter = `AND je."date" >= '${startDate.toISOString()}' AND je."date" <= '${endDate.toISOString()}'`;

  const rows = await prisma.$queryRawUnsafe<
    { code: string; name: string; classification: string; normal_balance: string; net: number }[]
  >(`
    SELECT
      ga.code,
      ga.name,
      ga.classification,
      ga."normalBalance" AS normal_balance,
      CASE
        WHEN ga."normalBalance" = 'DEBIT' THEN COALESCE(SUM(jl.debit) - SUM(jl.credit), 0)::float
        ELSE COALESCE(SUM(jl.credit) - SUM(jl.debit), 0)::float
      END AS net
    FROM gl_accounts ga
    JOIN journal_lines jl ON jl."glAccountId" = ga.id
    JOIN journal_entries je ON je.id = jl."journalEntryId"
      AND je.status = 'POSTED'
      ${dateFilter}
    WHERE ga."organizationId" = '${organizationId}'
      AND ga."isActive" = true
      AND ga."parentId" IS NOT NULL
    GROUP BY ga.id, ga.code, ga.name, ga.classification, ga."normalBalance"
    HAVING COALESCE(SUM(jl.debit), 0) != 0 OR COALESCE(SUM(jl.credit), 0) != 0
    ORDER BY ga.code
  `);

  // --- Operating Activities (indirect method) ---
  // Net Income = Revenue - Expenses
  const revenueTotal = rows
    .filter((r) => r.classification === "REVENUE")
    .reduce((s, r) => s + r.net, 0);
  const expenseTotal = rows
    .filter((r) => r.classification === "EXPENSE")
    .reduce((s, r) => s + r.net, 0);
  const netIncome = revenueTotal - expenseTotal;

  const operatingActivities: StatementLine[] = [
    { accountCode: "", accountName: "Net Income", amount: netIncome, isSubtotal: true },
  ];

  // Add back non-cash expenses (depreciation: 6080, bad debt: 6170)
  const nonCash = rows.filter((r) => ["6080", "6170"].includes(r.code));
  for (const item of nonCash) {
    operatingActivities.push({
      accountCode: item.code,
      accountName: `Add: ${item.name}`,
      amount: item.net,
    });
  }

  // Working capital changes (current assets excl. cash, current liabilities)
  // Increase in current assets = cash outflow (negative), Increase in current liabilities = cash inflow (positive)
  const workingCapitalAssets = rows.filter(
    (r) => r.classification === "ASSET" && !r.code.startsWith("10") && !r.code.startsWith("15") && !r.code.startsWith("16") && !r.code.startsWith("17")
  );
  for (const item of workingCapitalAssets) {
    // Asset increase is a use of cash
    operatingActivities.push({
      accountCode: item.code,
      accountName: `Change: ${item.name}`,
      amount: -item.net,
    });
  }

  const workingCapitalLiabilities = rows.filter(
    (r) => r.classification === "LIABILITY" && !r.code.startsWith("25") && !r.code.startsWith("26")
  );
  for (const item of workingCapitalLiabilities) {
    // Liability increase is a source of cash
    operatingActivities.push({
      accountCode: item.code,
      accountName: `Change: ${item.name}`,
      amount: item.net,
    });
  }

  // --- Investing Activities ---
  // Fixed assets (15xx), accumulated depreciation (16xx), intangibles (17xx)
  const investingActivities: StatementLine[] = rows
    .filter((r) => r.classification === "ASSET" && (r.code.startsWith("15") || r.code.startsWith("16") || r.code.startsWith("17")))
    .map((r) => ({
      accountCode: r.code,
      accountName: r.name,
      amount: -r.net, // asset purchases are cash outflows
    }));

  // --- Financing Activities ---
  // Long-term debt (25xx), lease obligations (26xx), equity (3xxx)
  const financingActivities: StatementLine[] = [
    ...rows
      .filter((r) => r.classification === "LIABILITY" && (r.code.startsWith("25") || r.code.startsWith("26")))
      .map((r) => ({
        accountCode: r.code,
        accountName: r.name,
        amount: r.net,
      })),
    ...rows
      .filter((r) => r.classification === "EQUITY")
      .map((r) => ({
        accountCode: r.code,
        accountName: r.name,
        amount: r.net,
      })),
  ];

  const totalOperating = operatingActivities.reduce((s, r) => s + r.amount, 0);
  const totalInvesting = investingActivities.reduce((s, r) => s + r.amount, 0);
  const totalFinancing = financingActivities.reduce((s, r) => s + r.amount, 0);

  return {
    period: `${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`,
    operatingActivities,
    totalOperating,
    investingActivities,
    totalInvesting,
    financingActivities,
    totalFinancing,
    netChange: totalOperating + totalInvesting + totalFinancing,
  };
}
