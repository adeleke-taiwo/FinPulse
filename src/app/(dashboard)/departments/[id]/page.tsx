"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Users,
  Briefcase,
  Calculator,
} from "lucide-react";

interface DepartmentKPIs {
  id: string;
  name: string;
  head: string;
  totalBudget: number;
  totalSpent: number;
  utilization: number;
  headcount: number;
  costPerEmployee: number;
  spendingTrend: { month: string; amount: number }[];
  topCategories: { category: string; amount: number }[];
  members: {
    id: string;
    name: string;
    role: string;
    email: string;
    joinedAt: string;
  }[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DepartmentDetailPage() {
  const params = useParams();
  const deptId = params.id as string;

  const [data, setData] = useState<DepartmentKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/departments/${deptId}/analytics`);
      if (res.ok) {
        const json = await res.json();
        // API returns { data } - extract the nested data object
        setData(json.data || json);
      }
    } catch {
      // Use mock data on failure
      setData({
        id: deptId,
        name: "Engineering",
        head: "Sarah Chen",
        totalBudget: 450000,
        totalSpent: 287000,
        utilization: 63.8,
        headcount: 45,
        costPerEmployee: 6378,
        spendingTrend: [
          { month: "Sep", amount: 42000 },
          { month: "Oct", amount: 45000 },
          { month: "Nov", amount: 48000 },
          { month: "Dec", amount: 52000 },
          { month: "Jan", amount: 50000 },
          { month: "Feb", amount: 50000 },
        ],
        topCategories: [
          { category: "Salaries & Wages", amount: 198000 },
          { category: "Cloud Infrastructure", amount: 38000 },
          { category: "Software & Licenses", amount: 22000 },
          { category: "Training", amount: 12000 },
          { category: "Equipment", amount: 11000 },
          { category: "Travel", amount: 6000 },
        ],
        members: [
          { id: "m1", name: "Sarah Chen", role: "VP Engineering", email: "sarah@company.com", joinedAt: "2023-01-15" },
          { id: "m2", name: "Alex Kumar", role: "Senior Engineer", email: "alex@company.com", joinedAt: "2023-03-20" },
          { id: "m3", name: "Emily Zhang", role: "Staff Engineer", email: "emily@company.com", joinedAt: "2023-06-10" },
          { id: "m4", name: "David Okafor", role: "Engineering Manager", email: "david@company.com", joinedAt: "2024-01-08" },
          { id: "m5", name: "Maria Santos", role: "Senior Engineer", email: "maria@company.com", joinedAt: "2024-04-15" },
          { id: "m6", name: "James Lee", role: "DevOps Engineer", email: "james@company.com", joinedAt: "2024-07-22" },
        ],
      });
    } finally {
      setLoading(false);
    }
  }, [deptId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[80px] rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[300px] rounded-lg" />
          <Skeleton className="h-[300px] rounded-lg" />
        </div>
      </div>
    );
  }

  const _variance = data.totalBudget - data.totalSpent;

  const stats = [
    { label: "Total Budget", value: formatCurrency(data.totalBudget), icon: DollarSign, color: "text-indigo-600" },
    { label: "Total Spent", value: formatCurrency(data.totalSpent), icon: TrendingUp, color: "text-amber-600" },
    { label: "Utilization", value: `${data.utilization.toFixed(1)}%`, icon: Calculator, color: data.utilization > 90 ? "text-destructive" : "text-green-600" },
    { label: "Headcount", value: data.headcount.toString(), icon: Users, color: "text-blue-600" },
    { label: "Cost / Employee", value: formatCurrency(data.costPerEmployee), icon: Briefcase, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/departments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{data.name}</h1>
            <p className="text-sm text-muted-foreground">
              Led by {data.head} - {data.headcount} employees
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center gap-3">
              <div className={`rounded-lg bg-muted p-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold font-mono tabular-nums">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Spending Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.spendingTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [formatCurrency(value ?? 0), "Spending"]}
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.topCategories}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={130}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
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
                  <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-medium">{member.name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{member.role}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{member.email}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
