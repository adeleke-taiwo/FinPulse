"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { AgingReport } from "@/lib/finance/aging";

interface AgingChartProps {
  report: AgingReport;
  title?: string;
}

const COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444", "#dc2626"];

export function AgingChart({ report, title = "Aging Report" }: AgingChartProps) {
  const data = [
    { name: "Current", amount: report.current.totalAmount, count: report.current.count },
    { name: "1-30 Days", amount: report.thirtyDays.totalAmount, count: report.thirtyDays.count },
    { name: "31-60 Days", amount: report.sixtyDays.totalAmount, count: report.sixtyDays.count },
    { name: "61-90 Days", amount: report.ninetyDays.totalAmount, count: report.ninetyDays.count },
    { name: "90+ Days", amount: report.overNinety.totalAmount, count: report.overNinety.count },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-sm text-muted-foreground">
          Total: {formatCurrency(report.totalOutstanding)}
        </span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number | undefined) => [formatCurrency(value ?? 0), "Amount"]}
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2">
        {data.map((bucket, i) => (
          <div key={bucket.name} className="text-center">
            <div className="text-xs text-muted-foreground">{bucket.name}</div>
            <div className="text-sm font-semibold" style={{ color: COLORS[i] }}>
              {bucket.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
