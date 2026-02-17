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
import { Skeleton } from "@/components/ui/skeleton";

interface CohortData {
  cohortData: { cohort: string; period: number; users: number; total: number; retention: number }[];
  churnData: { month: string; churn_rate: number }[];
}

function getHeatColor(value: number): string {
  if (value >= 80) return "bg-primary/80 text-primary-foreground";
  if (value >= 60) return "bg-primary/60 text-primary-foreground";
  if (value >= 40) return "bg-primary/40 text-foreground";
  if (value >= 20) return "bg-primary/20 text-foreground";
  return "bg-muted text-muted-foreground";
}

export default function CohortsPage() {
  const [data, setData] = useState<CohortData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/analytics/cohorts");
      if (res.ok) setData(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Cohort Retention</h1>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  // Build heatmap matrix
  const cohorts = [...new Set(data.cohortData.map((d) => d.cohort))].sort();
  const maxPeriod = Math.max(...data.cohortData.map((d) => d.period), 0);
  const periods = Array.from({ length: maxPeriod + 1 }, (_, i) => i);

  const matrix: Record<string, Record<number, number>> = {};
  for (const row of data.cohortData) {
    if (!matrix[row.cohort]) matrix[row.cohort] = {};
    matrix[row.cohort][row.period] = row.retention;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Cohort Retention</h1>

      {/* Retention Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Retention Heatmap (%)</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-card px-3 py-2 text-left font-medium text-muted-foreground">
                  Cohort
                </th>
                {periods.map((p) => (
                  <th key={p} className="px-2 py-2 text-center font-medium text-muted-foreground">
                    M{p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort) => (
                <tr key={cohort}>
                  <td className="sticky left-0 bg-card px-3 py-1.5 font-medium text-foreground">
                    {cohort}
                  </td>
                  {periods.map((p) => {
                    const val = matrix[cohort]?.[p];
                    return (
                      <td key={p} className="px-1 py-1">
                        {val !== undefined ? (
                          <div
                            className={`flex items-center justify-center rounded px-2 py-1.5 text-xs font-medium ${getHeatColor(val)}`}
                          >
                            {val.toFixed(0)}%
                          </div>
                        ) : (
                          <div className="px-2 py-1.5 text-center text-muted-foreground">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Churn Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Churn Rate</CardTitle>
        </CardHeader>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.churnData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                formatter={(v) => [`${(Number(v) * 100).toFixed(1)}%`, "Churn Rate"]}
              />
              <Line type="monotone" dataKey="churn_rate" stroke="var(--destructive)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
