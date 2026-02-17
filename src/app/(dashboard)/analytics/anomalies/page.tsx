"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface AnomalyData {
  anomalies: {
    id: string;
    amount: number;
    z_score: number;
    occurred_at: string;
    category: string;
    type: string;
    is_flagged: boolean;
  }[];
  flaggedSummary: { severity: string; count: number }[];
  trend: { month: string; count: number; avg_score: number }[];
}

const severityColors: Record<string, string> = {
  CRITICAL: "var(--destructive)",
  HIGH: "#f97316",
  MEDIUM: "var(--warning)",
  LOW: "var(--chart-3)",
};

export default function AnomaliesPage() {
  const [data, setData] = useState<AnomalyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/analytics/anomalies");
      if (res.ok) setData(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Anomaly Detection</h1>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const scatterData = data.anomalies.map((a) => ({
    amount: a.amount,
    zScore: a.z_score,
    category: a.category,
    isFlagged: a.is_flagged,
    fill: a.is_flagged ? "var(--destructive)" : "var(--chart-1)",
  }));

  const columns = [
    {
      key: "occurred_at",
      label: "Date",
      sortable: true,
      render: (a: Record<string, unknown>) =>
        format(new Date(a.occurred_at as string), "MMM d, yyyy HH:mm"),
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (a: Record<string, unknown>) => (
        <span className="font-medium">{formatCurrency(a.amount as number)}</span>
      ),
    },
    {
      key: "z_score",
      label: "Z-Score",
      sortable: true,
      render: (a: Record<string, unknown>) => (
        <span className={`font-medium ${(a.z_score as number) > 3 ? "text-destructive" : "text-warning"}`}>
          {(a.z_score as number).toFixed(2)}
        </span>
      ),
    },
    {
      key: "category",
      label: "Category",
    },
    {
      key: "type",
      label: "Type",
      render: (a: Record<string, unknown>) => <Badge>{a.type as string}</Badge>,
    },
    {
      key: "is_flagged",
      label: "Flagged",
      render: (a: Record<string, unknown>) =>
        a.is_flagged ? (
          <Badge variant="destructive">Flagged</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Anomaly Detection</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Scatter Plot */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Amount vs Z-Score</CardTitle>
          </CardHeader>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="amount"
                  name="Amount"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                />
                <YAxis
                  dataKey="zScore"
                  name="Z-Score"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                  formatter={(value, name) => [
                    name === "Amount" ? formatCurrency(Number(value)) : Number(value).toFixed(2),
                    name,
                  ]}
                />
                <Scatter data={scatterData} shape="circle">
                  {scatterData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} opacity={0.7} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Severity</CardTitle>
          </CardHeader>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.flaggedSummary} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="severity" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.flaggedSummary.map((entry, index) => (
                    <Cell key={index} fill={severityColors[entry.severity] || "var(--chart-1)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Anomaly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Anomaly Trend</CardTitle>
        </CardHeader>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke="var(--destructive)" strokeWidth={2} name="Anomalies" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Flagged Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detected Anomalies ({data.anomalies.length})</CardTitle>
        </CardHeader>
        <DataTable
          columns={columns}
          data={data.anomalies.slice(0, 50) as unknown as Record<string, unknown>[]}
        />
      </Card>
    </div>
  );
}
