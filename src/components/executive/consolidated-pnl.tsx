"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ConsolidatedPnLProps {
  revenue: number;
  expenses: number;
  netIncome: number;
  revenueChange?: number;
  expenseChange?: number;
}

export function ConsolidatedPnL({
  revenue,
  expenses,
  netIncome,
  revenueChange = 0,
  expenseChange = 0,
}: ConsolidatedPnLProps) {
  const margin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Consolidated P&L
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Revenue</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold tabular-nums text-green-600">
              {formatCurrency(revenue)}
            </span>
            {revenueChange !== 0 && (
              <span className={`flex items-center gap-0.5 text-xs ${revenueChange > 0 ? "text-green-600" : "text-destructive"}`}>
                {revenueChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(revenueChange).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Expenses</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold tabular-nums text-red-500">
              ({formatCurrency(expenses)})
            </span>
            {expenseChange !== 0 && (
              <span className={`flex items-center gap-0.5 text-xs ${expenseChange < 0 ? "text-green-600" : "text-destructive"}`}>
                {expenseChange < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {Math.abs(expenseChange).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="border-t border-border pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Net Income</span>
            <span className={`font-mono text-lg font-bold tabular-nums ${netIncome >= 0 ? "text-green-600" : "text-destructive"}`}>
              {formatCurrency(netIncome)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Profit Margin</span>
            <span className="text-xs font-medium">{margin.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
