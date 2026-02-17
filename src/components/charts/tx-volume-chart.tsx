"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface TxVolumeChartProps {
  data: { type: string; count: number; total: number }[];
}

const COLORS: Record<string, string> = {
  CREDIT: "var(--chart-5)",
  DEBIT: "var(--chart-1)",
  TRANSFER: "var(--chart-3)",
  FEE: "var(--chart-4)",
  INTEREST: "var(--chart-2)",
  REFUND: "var(--destructive)",
};

export function TxVolumeChart({ data }: TxVolumeChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    fill: COLORS[d.type] || "var(--chart-1)",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Volume by Type</CardTitle>
      </CardHeader>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="type"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: 12,
              }}
              formatter={(value, name) => [
                name === "count" ? value?.toLocaleString() : `$${value?.toLocaleString()}`,
                name === "count" ? "Transactions" : "Volume",
              ]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="var(--chart-1)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
