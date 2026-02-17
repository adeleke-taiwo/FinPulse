"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConsolidatedPnL } from "@/components/executive/consolidated-pnl";
import { CashPosition } from "@/components/executive/cash-position";
import { KeyRatios } from "@/components/executive/key-ratios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { FileText, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import type { FinancialRatios } from "@/lib/analytics/ratios";

interface ExecutiveDashboardData {
  revenue: number;
  expenses: number;
  netIncome: number;
  revenueChange: number;
  expenseChange: number;
  cashBalance: number;
  arOutstanding: number;
  apOutstanding: number;
  monthlyTrend: { month: string; revenue: number; expenses: number }[];
  apSummary: { totalOutstanding: number; overdue: number; dueThisWeek: number };
  arSummary: { totalOutstanding: number; overdue: number; dueThisWeek: number };
  recentJournalEntries: {
    id: string;
    date: string;
    description: string;
    amount: number;
    status: string;
  }[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const mockRatios: FinancialRatios = {
  currentRatio: 2.1,
  quickRatio: 1.8,
  debtToEquity: 0.6,
  returnOnEquity: 18.5,
  profitMargin: 22.3,
  operatingMargin: 28.1,
  assetTurnover: 1.4,
  workingCapital: 450000,
};

export default function ExecutivePage() {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/executive/dashboard");
      if (res.ok) {
        const json = await res.json();
        const d = json.data || json;
        const revenue = d.recentRevenue || d.revenue || 0;
        const expenses = d.recentExpenses || d.expenses || 0;
        setData({
          revenue,
          expenses,
          netIncome: d.netIncome ?? revenue - expenses,
          revenueChange: d.revenueChange || 0,
          expenseChange: d.expenseChange || 0,
          cashBalance: d.cashPosition || d.cashBalance || 0,
          arOutstanding: d.arOutstanding?.total ?? d.arOutstanding ?? 0,
          apOutstanding: d.apOutstanding?.total ?? d.apOutstanding ?? 0,
          monthlyTrend: (d.monthlyPnL || d.monthlyTrend || []).map(
            (r: { month: string; revenue: number; expenses: number }) => ({
              month: r.month,
              revenue: r.revenue,
              expenses: r.expenses,
            })
          ),
          apSummary: {
            totalOutstanding: d.apOutstanding?.total ?? d.apSummary?.totalOutstanding ?? 0,
            overdue: d.apSummary?.overdue ?? 0,
            dueThisWeek: d.apSummary?.dueThisWeek ?? 0,
          },
          arSummary: {
            totalOutstanding: d.arOutstanding?.total ?? d.arSummary?.totalOutstanding ?? 0,
            overdue: d.arSummary?.overdue ?? 0,
            dueThisWeek: d.arSummary?.dueThisWeek ?? 0,
          },
          recentJournalEntries: (d.recentJournalEntries || []).map(
            (je: {
              id: string;
              date: string;
              description: string;
              amount?: number;
              status: string;
              lines?: { debit: number }[];
            }) => ({
              id: je.id,
              date: je.date
                ? new Date(je.date).toISOString().slice(0, 10)
                : "",
              description: je.description || "",
              amount:
                je.amount ??
                (je.lines
                  ? je.lines.reduce((sum, l) => sum + l.debit, 0)
                  : 0),
              status: je.status || "",
            })
          ),
        });
      }
    } catch {
      // Use mock data
      setData({
        revenue: 1250000,
        expenses: 875000,
        netIncome: 375000,
        revenueChange: 12.5,
        expenseChange: 5.2,
        cashBalance: 820000,
        arOutstanding: 340000,
        apOutstanding: 210000,
        monthlyTrend: [
          { month: "Sep", revenue: 180000, expenses: 130000 },
          { month: "Oct", revenue: 195000, expenses: 138000 },
          { month: "Nov", revenue: 210000, expenses: 142000 },
          { month: "Dec", revenue: 225000, expenses: 155000 },
          { month: "Jan", revenue: 215000, expenses: 148000 },
          { month: "Feb", revenue: 225000, expenses: 162000 },
        ],
        apSummary: { totalOutstanding: 210000, overdue: 35000, dueThisWeek: 48000 },
        arSummary: { totalOutstanding: 340000, overdue: 52000, dueThisWeek: 75000 },
        recentJournalEntries: [
          { id: "je-1", date: "2026-02-14", description: "Monthly payroll accrual", amount: 125000, status: "POSTED" },
          { id: "je-2", date: "2026-02-13", description: "Cloud hosting expense", amount: 18500, status: "POSTED" },
          { id: "je-3", date: "2026-02-12", description: "Revenue recognition - Q1", amount: 95000, status: "PENDING" },
          { id: "je-4", date: "2026-02-11", description: "Office lease prepayment", amount: 36000, status: "POSTED" },
          { id: "je-5", date: "2026-02-10", description: "Depreciation - equipment", amount: 8200, status: "POSTED" },
        ],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Executive Dashboard</h1>
            <p className="text-sm text-muted-foreground">CFO overview</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[350px] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground">CFO Financial Overview and Key Metrics</p>
        </div>
      </div>

      {/* Top Row: P&L + Cash Position + Key Ratios */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ConsolidatedPnL
          revenue={data.revenue}
          expenses={data.expenses}
          netIncome={data.netIncome}
          revenueChange={data.revenueChange}
          expenseChange={data.expenseChange}
        />
        <CashPosition
          cashBalance={data.cashBalance}
          arOutstanding={data.arOutstanding}
          apOutstanding={data.apOutstanding}
        />
        <div className="rounded-lg border border-border bg-card p-4">
          <KeyRatios ratios={mockRatios} />
        </div>
      </div>

      {/* Monthly Revenue/Expense Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <Tooltip
                  formatter={(value: number | undefined, name: string | undefined) => [
                    formatCurrency(value ?? 0),
                    name === "revenue" ? "Revenue" : "Expenses",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Expenses"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* AP/AR Summary Cards + Recent Journal Entries */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* AP Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Accounts Payable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Outstanding</span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatCurrency(data.apSummary.totalOutstanding)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm text-destructive">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  Overdue
                </span>
                <span className="font-mono font-semibold tabular-nums text-destructive">
                  {formatCurrency(data.apSummary.overdue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm text-amber-600">
                  <Clock className="h-3.5 w-3.5" />
                  Due This Week
                </span>
                <span className="font-mono font-semibold tabular-nums text-amber-600">
                  {formatCurrency(data.apSummary.dueThisWeek)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AR Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Accounts Receivable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Outstanding</span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatCurrency(data.arSummary.totalOutstanding)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm text-destructive">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Overdue
                </span>
                <span className="font-mono font-semibold tabular-nums text-destructive">
                  {formatCurrency(data.arSummary.overdue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm text-amber-600">
                  <Clock className="h-3.5 w-3.5" />
                  Due This Week
                </span>
                <span className="font-mono font-semibold tabular-nums text-amber-600">
                  {formatCurrency(data.arSummary.dueThisWeek)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Journal Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Journal Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentJournalEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{entry.description}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-semibold tabular-nums">
                      {formatCurrency(entry.amount)}
                    </p>
                    <Badge
                      variant={entry.status === "POSTED" ? "success" : "warning"}
                      className="text-[10px]"
                    >
                      {entry.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
