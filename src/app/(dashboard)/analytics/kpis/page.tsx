"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface KPIsData {
  series: {
    month: string;
    arpu: number;
    ltv: number;
    cac: number;
    growth_rate: number;
    profit_margin: number;
    retention_rate: number;
  }[];
  cards: Record<string, { value: number; change: number }>;
}

export default function KPIsPage() {
  const [data, setData] = useState<KPIsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/analytics/kpis");
      if (res.ok) setData(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Financial KPIs</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[150px]" />
          ))}
        </div>
      </div>
    );
  }

  const kpiCards = [
    { key: "arpu", title: "ARPU", format: (v: number) => formatCurrency(v), sparkKey: "arpu" as const, color: "var(--chart-1)" },
    { key: "ltv", title: "LTV", format: (v: number) => formatCurrency(v), sparkKey: "ltv" as const, color: "var(--chart-2)" },
    { key: "cac", title: "CAC", format: (v: number) => formatCurrency(v), sparkKey: "cac" as const, color: "var(--chart-3)" },
    { key: "profitMargin", title: "Profit Margin", format: (v: number) => `${v.toFixed(1)}%`, sparkKey: "profit_margin" as const, color: "var(--chart-5)" },
    { key: "growthRate", title: "Growth Rate", format: (v: number) => `${v.toFixed(1)}%`, sparkKey: "growth_rate" as const, color: "var(--chart-4)" },
    { key: "retentionRate", title: "Retention Rate", format: (v: number) => `${v.toFixed(1)}%`, sparkKey: "retention_rate" as const, color: "var(--chart-1)" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Financial KPIs</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((kpi) => {
          const cardData = data.cards[kpi.key];
          return (
            <Card key={kpi.key}>
              <p className="text-xs font-medium text-muted-foreground">{kpi.title}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {kpi.format(cardData?.value || 0)}
              </p>
              <p
                className={`mt-1 text-xs font-medium ${
                  (cardData?.change || 0) >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {formatPercent(cardData?.change || 0)} vs prev month
              </p>
              <div className="mt-3">
                <Sparkline
                  data={data.series.map((s) => s[kpi.sparkKey] as number)}
                  color={kpi.color}
                  height={40}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Growth Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Growth Rate Trend</CardTitle>
        </CardHeader>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.series} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                formatter={(v) => [`${Number(v).toFixed(2)}%`, ""]}
              />
              <Line type="monotone" dataKey="growth_rate" stroke="var(--chart-4)" strokeWidth={2} dot={{ r: 3 }} name="Growth Rate" />
              <Line type="monotone" dataKey="retention_rate" stroke="var(--chart-5)" strokeWidth={2} dot={{ r: 3 }} name="Retention" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
