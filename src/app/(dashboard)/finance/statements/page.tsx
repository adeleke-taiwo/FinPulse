"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IncomeStatementView, BalanceSheetView } from "@/components/finance/financial-statement";
import { formatCurrency } from "@/lib/utils";
import type { IncomeStatement, BalanceSheet, CashFlowStatement } from "@/lib/finance/statements";
import { FileText } from "lucide-react";

type StatementType = "income" | "balance" | "cashflow";

const tabs: { value: StatementType; label: string }[] = [
  { value: "income", label: "Income Statement" },
  { value: "balance", label: "Balance Sheet" },
  { value: "cashflow", label: "Cash Flow" },
];

export default function FinancialStatementsPage() {
  const [activeTab, setActiveTab] = useState<StatementType>("income");
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowStatement | null>(null);
  const [, setError] = useState<string | null>(null);

  const fetchStatement = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: activeTab,
        endDate,
      });
      if (activeTab !== "balance") {
        params.set("startDate", startDate);
      }

      const res = await fetch(`/api/finance/statements?${params}`);
      if (res.ok) {
        const json = await res.json();
        switch (activeTab) {
          case "income":
            setIncomeStatement(json.data);
            break;
          case "balance":
            setBalanceSheet(json.data);
            break;
          case "cashflow":
            setCashFlow(json.data);
            break;
        }
      }
    } catch {
      setError("Failed to load financial statement.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate]);

  useEffect(() => {
    if (!startDate || !endDate) {
      const defaultStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
      const defaultEnd = new Date().toISOString().split("T")[0];
      setStartDate(defaultStart);
      setEndDate(defaultEnd);
      return;
    }
    fetchStatement();
  }, [fetchStatement, startDate, endDate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Statements</h1>
          <p className="text-sm text-muted-foreground">
            Generate and view financial reports
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date range picker */}
      <div className="flex flex-wrap items-end gap-4">
        {activeTab !== "balance" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {activeTab === "balance" ? "As of Date" : "End Date"}
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <Button size="sm" variant="outline" onClick={fetchStatement}>
          Generate
        </Button>
      </div>

      {/* Statement content */}
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          {/* Income Statement */}
          {activeTab === "income" && (
            incomeStatement ? (
              <IncomeStatementView data={incomeStatement} />
            ) : (
              <EmptyState message="No income statement data available for the selected period." />
            )
          )}

          {/* Balance Sheet */}
          {activeTab === "balance" && (
            balanceSheet ? (
              <BalanceSheetView data={balanceSheet} />
            ) : (
              <EmptyState message="No balance sheet data available for the selected date." />
            )
          )}

          {/* Cash Flow */}
          {activeTab === "cashflow" && (
            cashFlow ? (
              <CashFlowView data={cashFlow} />
            ) : (
              <EmptyState message="No cash flow data available for the selected period." />
            )
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12">
        <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

function CashFlowView({ data }: { data: CashFlowStatement }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 text-center">
        <h2 className="text-lg font-bold">Cash Flow Statement</h2>
        <p className="text-sm text-muted-foreground">{data.period}</p>
      </div>

      <CashFlowSection
        title="Operating Activities"
        lines={data.operatingActivities}
        total={data.totalOperating}
      />

      <CashFlowSection
        title="Investing Activities"
        lines={data.investingActivities}
        total={data.totalInvesting}
      />

      <CashFlowSection
        title="Financing Activities"
        lines={data.financingActivities}
        total={data.totalFinancing}
      />

      <div className="flex items-center justify-between border-t-2 border-foreground px-3 py-3 text-lg font-bold">
        <span>Net Change in Cash</span>
        <span
          className={`font-mono tabular-nums ${
            data.netChange >= 0 ? "text-green-600" : "text-destructive"
          }`}
        >
          {formatCurrency(data.netChange)}
        </span>
      </div>
    </div>
  );
}

function CashFlowSection({
  title,
  lines,
  total,
}: {
  title: string;
  lines: { accountCode: string; accountName: string; amount: number }[];
  total: number;
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-1">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-1 text-sm">
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
        <span>Total {title}</span>
        <span className="font-mono tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
