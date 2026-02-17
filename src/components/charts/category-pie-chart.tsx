"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryPieChartProps {
  data: { name: string; total: number; count: number; color: string }[];
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
      </CardHeader>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: 12,
              }}
              formatter={(value) => [`$${value?.toLocaleString()}`, "Total"]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => (
                <span style={{ color: "var(--foreground)" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
