"use client";

import { Banknote, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CashPositionProps {
  cashBalance: number;
  arOutstanding: number;
  apOutstanding: number;
}

export function CashPosition({ cashBalance, arOutstanding, apOutstanding }: CashPositionProps) {
  const netCashPosition = cashBalance + arOutstanding - apOutstanding;
  const cashRatio = apOutstanding > 0 ? cashBalance / apOutstanding : 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Cash Position
      </h3>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
          <Banknote className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <p className="font-mono text-xl font-bold tabular-nums">{formatCurrency(cashBalance)}</p>
          <p className="text-xs text-muted-foreground">Cash & Equivalents</p>
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">AR Outstanding</span>
          <span className="font-mono tabular-nums text-blue-600">+{formatCurrency(arOutstanding)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">AP Outstanding</span>
          <span className="font-mono tabular-nums text-red-500">-{formatCurrency(apOutstanding)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
          <span>Net Position</span>
          <span className="font-mono tabular-nums">{formatCurrency(netCashPosition)}</span>
        </div>
      </div>

      <div className="mt-3 rounded-md bg-muted/50 px-3 py-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Cash Coverage Ratio</span>
          <span className={`font-semibold ${cashRatio >= 1 ? "text-green-600" : "text-amber-600"}`}>
            {cashRatio.toFixed(2)}x
          </span>
        </div>
      </div>
    </div>
  );
}
