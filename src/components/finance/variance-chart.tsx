"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface VarianceData {
  name: string;
  budgeted: number;
  actual: number;
}

interface VarianceChartProps {
  data: VarianceData[];
  title?: string;
}

export function VarianceChart({ data, title = "Budget vs Actual" }: VarianceChartProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={50} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => [
                formatCurrency(value ?? 0),
                name === "budgeted" ? "Budget" : "Actual",
              ]}
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend />
            <Bar dataKey="budgeted" fill="#6366f1" radius={[4, 4, 0, 0]} name="Budget" />
            <Bar dataKey="actual" fill="#22c55e" radius={[4, 4, 0, 0]} name="Actual" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
