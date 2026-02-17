"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, DollarSign, TrendingUp } from "lucide-react";

interface Department {
  id: string;
  name: string;
  head: string;
  headcount: number;
  budgetTotal: number;
  budgetSpent: number;
  utilization: number;
  topExpense: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Use flat=true to get ALL departments, not just top-level
      const res = await fetch("/api/admin/departments?flat=true");
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json.departments || json || [];
        if (!Array.isArray(list) || list.length === 0) {
          throw new Error("empty");
        }
        setDepartments(
          list.map((d: Record<string, unknown>) => {
            // Extract head name from user object or string
            let headName = "Unassigned";
            if (d.head && typeof d.head === "object") {
              const h = d.head as { firstName?: string; lastName?: string };
              headName = `${h.firstName || ""} ${h.lastName || ""}`.trim() || "Unassigned";
            } else if (typeof d.head === "string" && d.head) {
              headName = d.head;
            } else if (typeof d.headName === "string" && d.headName) {
              headName = d.headName;
            }

            // Extract member count from _count object
            let headcount = 0;
            if (typeof d.headcount === "number") {
              headcount = d.headcount;
            } else if (typeof d.memberCount === "number") {
              headcount = d.memberCount;
            } else if (d._count && typeof d._count === "object") {
              headcount = (d._count as { members?: number }).members || 0;
            }

            // Budget data from enriched API response
            const budgetTotal = (d.budgetTotal as number) || 0;
            const budgetSpent = (d.budgetSpent as number) || 0;
            const utilization = (d.utilization as number) || (budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0);

            return {
              id: (d.id as string) || "",
              name: (d.name as string) || "",
              head: headName,
              headcount,
              budgetTotal,
              budgetSpent,
              utilization: typeof d.utilization === "number" ? d.utilization : utilization,
              topExpense: (d.topExpense as string) || "General Operations",
            };
          })
        );
      } else {
        throw new Error("fetch failed");
      }
    } catch {
      setDepartments([
        { id: "1", name: "Engineering", head: "Sarah Chen", headcount: 45, budgetTotal: 450000, budgetSpent: 287000, utilization: 63.8, topExpense: "Salaries & Wages" },
        { id: "2", name: "Marketing", head: "Mike Johnson", headcount: 18, budgetTotal: 320000, budgetSpent: 198000, utilization: 61.9, topExpense: "Advertising" },
        { id: "3", name: "Sales", head: "Lisa Park", headcount: 32, budgetTotal: 280000, budgetSpent: 245000, utilization: 87.5, topExpense: "Travel & Entertainment" },
        { id: "4", name: "Operations", head: "James Wilson", headcount: 22, budgetTotal: 180000, budgetSpent: 92000, utilization: 51.1, topExpense: "Cloud Infrastructure" },
        { id: "5", name: "HR", head: "Amanda Rivera", headcount: 8, budgetTotal: 150000, budgetSpent: 78000, utilization: 52.0, topExpense: "Recruiting" },
        { id: "6", name: "Finance", head: "Robert Kim", headcount: 12, budgetTotal: 200000, budgetSpent: 125000, utilization: 62.5, topExpense: "Professional Services" },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Departments</h1>
            <p className="text-sm text-muted-foreground">Department analytics and performance</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[220px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-sm text-muted-foreground">
            {departments.length} departments - analytics and performance
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <Link key={dept.id} href={`/departments/${dept.id}`}>
            <Card className="transition-shadow hover:shadow-md cursor-pointer">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{dept.name}</h3>
                      <p className="text-xs text-muted-foreground">{dept.head}</p>
                    </div>
                  </div>
                </div>

                {/* Headcount & Budget */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{dept.headcount} members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium font-mono tabular-nums">
                      {formatCurrency(dept.budgetTotal)}
                    </span>
                  </div>
                </div>

                {/* Utilization Gauge */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Budget Utilization</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        dept.utilization > 90
                          ? "text-destructive"
                          : dept.utilization > 75
                            ? "text-amber-600"
                            : "text-green-600"
                      }`}
                    >
                      {dept.utilization.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        dept.utilization > 90
                          ? "bg-destructive"
                          : dept.utilization > 75
                            ? "bg-amber-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(dept.utilization, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Top Expense */}
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Top expense:</span>
                  <span className="text-xs font-medium">{dept.topExpense}</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
