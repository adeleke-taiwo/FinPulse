"use client";

import { formatCurrency } from "@/lib/utils";
import type { IncomeStatement, BalanceSheet } from "@/lib/finance/statements";

interface StatementLineRow {
  accountCode: string;
  accountName: string;
  amount: number;
  isSubtotal?: boolean;
}

function StatementSection({
  title,
  lines,
  total,
  totalLabel,
}: {
  title: string;
  lines: StatementLineRow[];
  total: number;
  totalLabel: string;
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-1">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-3 py-1 text-sm ${
              line.isSubtotal ? "font-semibold" : ""
            }`}
          >
            <span>
              {line.accountCode && (
                <span className="mr-2 font-mono text-xs text-muted-foreground">
                  {line.accountCode}
                </span>
              )}
              {line.accountName}
            </span>
            <span className="font-mono tabular-nums">{formatCurrency(line.amount)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-border px-3 py-2 font-semibold">
        <span>{totalLabel}</span>
        <span className="font-mono tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

export function IncomeStatementView({ data }: { data: IncomeStatement }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 text-center">
        <h2 className="text-lg font-bold">Income Statement</h2>
        <p className="text-sm text-muted-foreground">{data.period}</p>
      </div>

      <StatementSection
        title="Revenue"
        lines={data.revenue}
        total={data.totalRevenue}
        totalLabel="Total Revenue"
      />

      <StatementSection
        title="Expenses"
        lines={data.expenses}
        total={data.totalExpenses}
        totalLabel="Total Expenses"
      />

      <div className="flex items-center justify-between border-t-2 border-foreground px-3 py-3 text-lg font-bold">
        <span>Net Income</span>
        <span className={`font-mono tabular-nums ${data.netIncome >= 0 ? "text-green-600" : "text-destructive"}`}>
          {formatCurrency(data.netIncome)}
        </span>
      </div>
    </div>
  );
}

export function BalanceSheetView({ data }: { data: BalanceSheet }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 text-center">
        <h2 className="text-lg font-bold">Balance Sheet</h2>
        <p className="text-sm text-muted-foreground">As of {data.asOfDate}</p>
      </div>

      <StatementSection
        title="Assets"
        lines={data.assets}
        total={data.totalAssets}
        totalLabel="Total Assets"
      />

      <StatementSection
        title="Liabilities"
        lines={data.liabilities}
        total={data.totalLiabilities}
        totalLabel="Total Liabilities"
      />

      <StatementSection
        title="Equity"
        lines={data.equity}
        total={data.totalEquity}
        totalLabel="Total Equity"
      />

      <div className="flex items-center justify-between border-t-2 border-foreground px-3 py-3 text-lg font-bold">
        <span>Liabilities + Equity</span>
        <span className="font-mono tabular-nums">
          {formatCurrency(data.totalLiabilities + data.totalEquity)}
        </span>
      </div>
    </div>
  );
}
