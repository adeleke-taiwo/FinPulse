"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, toTitleCase } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";

interface RiskData {
  data: {
    id: string;
    severity: string;
    status: string;
    ruleTriggered: string;
    riskScore: number;
    createdAt: string;
    transaction: {
      id: string;
      amount: number;
      type: string;
      occurredAt: string;
      fromAccount: { accountNumber: string } | null;
    };
  }[];
  total: number;
  page: number;
  totalPages: number;
  distribution: { severity: string; count: number }[];
  trend: { month: string; count: number }[];
}

const severityColors: Record<string, string> = {
  CRITICAL: "var(--destructive)",
  HIGH: "#f97316",
  MEDIUM: "var(--warning)",
  LOW: "var(--chart-3)",
};

const severityVariant: Record<string, "destructive" | "warning" | "default"> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "default",
};

export default function RiskPage() {
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (severityFilter) params.set("severity", severityFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/risk?${params}`);
      if (res.ok) setData(await res.json());
    } catch {
      setError("Failed to load risk data.");
    } finally {
      setLoading(false);
    }
  }, [page, severityFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Risk Management</h1>
        {error && <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const columns = [
    {
      key: "createdAt",
      label: "Date",
      render: (r: Record<string, unknown>) =>
        format(new Date(r.createdAt as string), "MMM d, yyyy HH:mm"),
    },
    {
      key: "severity",
      label: "Severity",
      render: (r: Record<string, unknown>) => (
        <Badge variant={severityVariant[(r as { severity: string }).severity] || "default"}>
          {toTitleCase((r as { severity: string }).severity)}
        </Badge>
      ),
    },
    {
      key: "riskScore",
      label: "Score",
      render: (r: Record<string, unknown>) => (
        <span className="font-bold">{(r.riskScore as number).toFixed(0)}</span>
      ),
    },
    {
      key: "ruleTriggered",
      label: "Rule",
      render: (r: Record<string, unknown>) => (
        <span className="text-sm">{toTitleCase((r.ruleTriggered as string))}</span>
      ),
    },
    {
      key: "amount",
      label: "Tx Amount",
      render: (r: Record<string, unknown>) => {
        const tx = r.transaction as { amount: number; id: string };
        return (
          <Link href={`/transactions/${tx.id}`} className="text-primary hover:underline">
            {formatCurrency(tx.amount)}
          </Link>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (r: Record<string, unknown>) => (
        <Badge variant="outline">{toTitleCase((r as { status: string }).status)}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Risk Management</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
          </CardHeader>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="severity" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.distribution.map((entry) => (
                    <Cell key={entry.severity} fill={severityColors[entry.severity] || "var(--chart-1)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Risk Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Risk Flags</CardTitle>
          </CardHeader>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="count" stroke="var(--destructive)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
        >
          <option value="">All Severities</option>
          {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => (
            <option key={s} value={s}>{toTitleCase(s)}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
        >
          <option value="">All Statuses</option>
          {["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"].map((s) => (
            <option key={s} value={s}>{toTitleCase(s)}</option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={data.data as unknown as Record<string, unknown>[]} loading={loading} />
      <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
    </div>
  );
}
