"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  CheckCircle,
  DollarSign,
  BarChart3,
  Plus,
  ArrowRight,
  Users,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

interface Budget {
  id: string;
  department: string;
  departmentId: string;
  fiscalYear: number;
  status: string;
  totalAmount: number;
  spentAmount: number;
  utilization: number;
  memberCount: number;
  costPerMember: number;
}

interface BudgetSummary {
  totalBudgets: number;
  activeBudgets: number;
  totalAllocated: number;
  totalSpent: number;
  avgUtilization: number;
  overBudgetCount: number;
  budgets: Budget[];
}

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive"> = {
  DRAFT: "default",
  ACTIVE: "success",
  CLOSED: "outline" as "default",
  OVER_BUDGET: "destructive",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BudgetsPage() {
  const [data, setData] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Fetch budgets and departments in parallel
      const [budgetRes, deptRes] = await Promise.all([
        fetch("/api/finance/budgets"),
        fetch("/api/admin/departments?flat=true"),
      ]);

      if (!budgetRes.ok) throw new Error("budgets fetch failed");

      const budgetJson = await budgetRes.json();
      const rawBudgets = budgetJson.data || budgetJson.budgets || budgetJson || [];

      // Build department member count map
      const deptMemberMap: Record<string, number> = {};
      if (deptRes.ok) {
        const deptJson = await deptRes.json();
        const depts = deptJson.data || deptJson || [];
        for (const d of depts) {
          const id = d.id as string;
          const members = d._count && typeof d._count === "object"
            ? (d._count as { members?: number }).members || 0
            : 0;
          deptMemberMap[id] = members;
        }
      }

      const budgets: Budget[] = rawBudgets.map(
        (b: Record<string, unknown>) => {
          const total = Number(b.totalAmount) || 0;
          // Sum actualAmount from line items
          let spent = 0;
          if (Array.isArray(b.lineItems)) {
            spent = (b.lineItems as { actualAmount?: number }[]).reduce(
              (sum, li) => sum + (Number(li.actualAmount) || 0), 0
            );
          } else {
            spent = Number(b.spentAmount) || 0;
          }

          const deptName = (b.department && typeof b.department === "object")
            ? (b.department as { name: string }).name
            : (b.department as string) || "General";

          const deptId = (b.departmentId as string) || "";
          const memberCount = deptMemberMap[deptId] || 0;
          const costPerMember = memberCount > 0 ? spent / memberCount : 0;

          return {
            id: b.id as string,
            department: deptName,
            departmentId: deptId,
            fiscalYear: (b.fiscalYear as number) || new Date().getFullYear(),
            status: (b.status as string) || "ACTIVE",
            totalAmount: total,
            spentAmount: spent,
            utilization: total > 0 ? (spent / total) * 100 : 0,
            memberCount,
            costPerMember,
          };
        }
      );

      // Sort by utilization descending to highlight highest usage
      budgets.sort((a, b) => b.utilization - a.utilization);

      const activeBudgets = budgets.filter((b) => b.status === "ACTIVE").length;
      const totalAllocated = budgets.reduce((sum, b) => sum + b.totalAmount, 0);
      const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);
      const avgUtilization =
        budgets.length > 0
          ? budgets.reduce((sum, b) => sum + b.utilization, 0) / budgets.length
          : 0;
      const overBudgetCount = budgets.filter((b) => b.utilization > 90).length;

      setData({
        totalBudgets: budgets.length,
        activeBudgets,
        totalAllocated,
        totalSpent,
        avgUtilization,
        overBudgetCount,
        budgets,
      });
    } catch {
      const mockBudgets: Budget[] = [
        { id: "1", department: "Engineering", departmentId: "", fiscalYear: 2025, status: "ACTIVE", totalAmount: 1500000, spentAmount: 1125000, utilization: 75.0, memberCount: 18, costPerMember: 62500 },
        { id: "2", department: "Sales", departmentId: "", fiscalYear: 2025, status: "ACTIVE", totalAmount: 1100000, spentAmount: 880000, utilization: 80.0, memberCount: 12, costPerMember: 73333 },
        { id: "3", department: "Marketing", departmentId: "", fiscalYear: 2025, status: "ACTIVE", totalAmount: 800000, spentAmount: 640000, utilization: 80.0, memberCount: 8, costPerMember: 80000 },
        { id: "4", department: "Finance", departmentId: "", fiscalYear: 2025, status: "ACTIVE", totalAmount: 500000, spentAmount: 375000, utilization: 75.0, memberCount: 5, costPerMember: 75000 },
        { id: "5", department: "HR", departmentId: "", fiscalYear: 2025, status: "ACTIVE", totalAmount: 350000, spentAmount: 245000, utilization: 70.0, memberCount: 4, costPerMember: 61250 },
        { id: "6", department: "Operations", departmentId: "", fiscalYear: 2025, status: "ACTIVE", totalAmount: 550000, spentAmount: 412500, utilization: 75.0, memberCount: 6, costPerMember: 68750 },
      ];
      setData({
        totalBudgets: mockBudgets.length,
        activeBudgets: mockBudgets.length,
        totalAllocated: mockBudgets.reduce((s, b) => s + b.totalAmount, 0),
        totalSpent: mockBudgets.reduce((s, b) => s + b.spentAmount, 0),
        avgUtilization: mockBudgets.reduce((s, b) => s + b.utilization, 0) / mockBudgets.length,
        overBudgetCount: 0,
        budgets: mockBudgets,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Budgets</h1>
            <p className="text-sm text-muted-foreground">Budget planning and tracking</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  const kpis = [
    {
      title: "Total Allocated",
      value: formatCurrency(data.totalAllocated),
      subtitle: `${data.totalBudgets} department budgets`,
      icon: DollarSign,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Total Spent",
      value: formatCurrency(data.totalSpent),
      subtitle: `${formatCurrency(data.totalAllocated - data.totalSpent)} remaining`,
      icon: Wallet,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-100 dark:bg-indigo-900/30",
    },
    {
      title: "Average Utilization",
      value: `${data.avgUtilization.toFixed(1)}%`,
      subtitle: `${data.activeBudgets} active budgets`,
      icon: BarChart3,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      title: "Over 90% Utilized",
      value: data.overBudgetCount.toString(),
      subtitle: data.overBudgetCount > 0 ? "Departments need attention" : "All within budget",
      icon: data.overBudgetCount > 0 ? AlertTriangle : CheckCircle,
      color: data.overBudgetCount > 0
        ? "text-red-600 dark:text-red-400"
        : "text-green-600 dark:text-green-400",
      bg: data.overBudgetCount > 0
        ? "bg-red-100 dark:bg-red-900/30"
        : "bg-green-100 dark:bg-green-900/30",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="text-sm text-muted-foreground">
            FY {data.budgets[0]?.fiscalYear || new Date().getFullYear()} budget planning and tracking
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/finance/budgets/new">
            <Plus className="h-3.5 w-3.5" />
            New Budget
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.title}</p>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground">{kpi.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overall Utilization Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Overall Budget Utilization</span>
            </div>
            <span className="text-sm font-bold tabular-nums">
              {formatCurrency(data.totalSpent)} / {formatCurrency(data.totalAllocated)}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                data.avgUtilization > 90
                  ? "bg-destructive"
                  : data.avgUtilization > 75
                    ? "bg-amber-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${Math.min(data.avgUtilization, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Department Budgets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Department Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Department</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Members</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Allocated</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Spent</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Remaining</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[180px]">Utilization</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cost per Member</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.budgets.map((budget) => {
                  const remaining = budget.totalAmount - budget.spentAmount;
                  return (
                    <tr
                      key={budget.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-2.5">
                        <span className="font-medium block truncate max-w-[160px]">{budget.department}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span className="text-xs tabular-nums">{budget.memberCount}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={statusVariant[budget.status] || "default"}>
                          {budget.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        {formatCurrency(budget.totalAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        {formatCurrency(budget.spentAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        <span className={remaining < 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}>
                          {formatCurrency(remaining)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${
                                budget.utilization > 90
                                  ? "bg-destructive"
                                  : budget.utilization > 75
                                    ? "bg-amber-500"
                                    : "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(budget.utilization, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold tabular-nums ${
                            budget.utilization > 90
                              ? "text-destructive"
                              : budget.utilization > 75
                                ? "text-amber-600"
                                : "text-muted-foreground"
                          }`}>
                            {budget.utilization.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-xs text-muted-foreground">
                        {budget.memberCount > 0 ? formatCurrency(budget.costPerMember) : "\u2014"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/finance/budgets/${budget.id}`}>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
