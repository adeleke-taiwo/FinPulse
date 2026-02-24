"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BudgetTable } from "@/components/finance/budget-table";
import { VarianceChart } from "@/components/finance/variance-chart";
import { ArrowLeft, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { toTitleCase } from "@/lib/utils";

interface BudgetLineItem {
  id: string;
  accountCode: string;
  accountName: string;
  q1Amount: number;
  q2Amount: number;
  q3Amount: number;
  q4Amount: number;
  totalAmount: number;
  actualAmount: number;
}

interface BudgetDetail {
  id: string;
  department: string;
  fiscalYear: number;
  status: string;
  periodType: string;
  totalAmount: number;
  spentAmount: number;
  createdAt: string;
  lineItems: BudgetLineItem[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive"> = {
  DRAFT: "default",
  ACTIVE: "success",
  CLOSED: "default",
  OVER_BUDGET: "destructive",
};

export default function BudgetDetailPage() {
  const params = useParams();
  const budgetId = params.id as string;

  const [budget, setBudget] = useState<BudgetDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBudget = useCallback(async () => {
    try {
      const res = await fetch(`/api/finance/budgets/${budgetId}`);
      if (res.ok) {
        setBudget(await res.json());
      }
    } catch {
      // Use mock data on failure
      setBudget({
        id: budgetId,
        department: "Engineering",
        fiscalYear: 2026,
        status: "ACTIVE",
        periodType: "ANNUAL",
        totalAmount: 450000,
        spentAmount: 287000,
        createdAt: "2025-12-15",
        lineItems: [
          { id: "1", accountCode: "6100", accountName: "Salaries & Wages", q1Amount: 75000, q2Amount: 75000, q3Amount: 80000, q4Amount: 80000, totalAmount: 310000, actualAmount: 198000 },
          { id: "2", accountCode: "6200", accountName: "Software & Licenses", q1Amount: 8000, q2Amount: 8000, q3Amount: 10000, q4Amount: 10000, totalAmount: 36000, actualAmount: 22000 },
          { id: "3", accountCode: "6300", accountName: "Cloud Infrastructure", q1Amount: 12000, q2Amount: 12000, q3Amount: 15000, q4Amount: 15000, totalAmount: 54000, actualAmount: 38000 },
          { id: "4", accountCode: "6400", accountName: "Training & Development", q1Amount: 5000, q2Amount: 5000, q3Amount: 5000, q4Amount: 5000, totalAmount: 20000, actualAmount: 12000 },
          { id: "5", accountCode: "6500", accountName: "Equipment & Hardware", q1Amount: 4000, q2Amount: 4000, q3Amount: 6000, q4Amount: 6000, totalAmount: 20000, actualAmount: 11000 },
          { id: "6", accountCode: "6600", accountName: "Travel & Conferences", q1Amount: 2500, q2Amount: 2500, q3Amount: 2500, q4Amount: 2500, totalAmount: 10000, actualAmount: 6000 },
        ],
      });
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  if (loading || !budget) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[80px] rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  const utilization = budget.totalAmount > 0 ? (budget.spentAmount / budget.totalAmount) * 100 : 0;
  const variance = budget.totalAmount - budget.spentAmount;

  const varianceChartData = budget.lineItems.map((item) => ({
    name: item.accountName,
    budgeted: item.totalAmount,
    actual: item.actualAmount,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finance/budgets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{budget.department} Budget</h1>
              <Badge variant={statusVariant[budget.status] || "default"}>
                {toTitleCase(budget.status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              FY {budget.fiscalYear} - {budget.periodType}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2.5 text-indigo-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Budget</p>
              <p className="text-lg font-bold font-mono tabular-nums">{formatCurrency(budget.totalAmount)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2.5 text-amber-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Spent to Date</p>
              <p className="text-lg font-bold font-mono tabular-nums">{formatCurrency(budget.spentAmount)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg bg-muted p-2.5 ${variance >= 0 ? "text-green-600" : "text-destructive"}`}>
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Variance</p>
              <p className={`text-lg font-bold font-mono tabular-nums ${variance >= 0 ? "text-green-600" : "text-destructive"}`}>
                {formatCurrency(variance)}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg bg-muted p-2.5 ${utilization > 90 ? "text-destructive" : utilization > 75 ? "text-amber-600" : "text-green-600"}`}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Utilization</p>
              <p className="text-lg font-bold tabular-nums">{utilization.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Budget Line Items Table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Line Items & Variance</h2>
        <BudgetTable lineItems={budget.lineItems} readOnly />
      </div>

      {/* Variance Chart */}
      <VarianceChart data={varianceChartData} title="Budget vs Actual by Category" />
    </div>
  );
}
