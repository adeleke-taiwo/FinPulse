"use client";

import type { FinancialRatios } from "@/lib/analytics/ratios";

interface KeyRatiosProps {
  ratios: FinancialRatios;
}

function RatioCard({
  label,
  value,
  format,
  benchmark,
  inverseBenchmark,
}: {
  label: string;
  value: number;
  format: "ratio" | "percent" | "currency";
  benchmark?: number;
  inverseBenchmark?: boolean;
}) {
  const formatted =
    format === "ratio"
      ? value.toFixed(2) + "x"
      : format === "percent"
        ? value.toFixed(1) + "%"
        : "$" + value.toLocaleString("en-US", { minimumFractionDigits: 0 });

  let status = "text-foreground";
  if (benchmark !== undefined) {
    const good = inverseBenchmark ? value < benchmark : value >= benchmark;
    status = good ? "text-green-600" : "text-amber-600";
  }

  return (
    <div className="rounded-lg border border-border bg-card p-2.5 min-w-0">
      <p className="text-[11px] text-muted-foreground truncate">{label}</p>
      <p className={`mt-0.5 text-sm font-bold font-mono tabular-nums ${status}`}>{formatted}</p>
    </div>
  );
}

export function KeyRatios({ ratios }: KeyRatiosProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Key Financial Ratios
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <RatioCard label="Current Ratio" value={ratios.currentRatio} format="ratio" benchmark={1.5} />
        <RatioCard label="Quick Ratio" value={ratios.quickRatio} format="ratio" benchmark={1.0} />
        <RatioCard label="Debt to Equity" value={ratios.debtToEquity} format="ratio" benchmark={2.0} inverseBenchmark />
        <RatioCard label="Return on Equity" value={ratios.returnOnEquity} format="percent" benchmark={15} />
        <RatioCard label="Profit Margin" value={ratios.profitMargin} format="percent" benchmark={10} />
        <RatioCard label="Operating Margin" value={ratios.operatingMargin} format="percent" benchmark={15} />
        <RatioCard label="Asset Turnover" value={ratios.assetTurnover} format="ratio" benchmark={1.0} />
        <RatioCard label="Working Capital" value={ratios.workingCapital} format="currency" benchmark={0} />
      </div>
    </div>
  );
}
