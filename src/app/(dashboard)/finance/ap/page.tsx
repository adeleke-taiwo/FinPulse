"use client";

import { useState, useEffect } from "react";
import { AgingChart } from "@/components/finance/aging-chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import {
  DollarSign,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
  Building2,
} from "lucide-react";
import Link from "next/link";
import type { AgingReport } from "@/lib/finance/aging";

interface APDashboardData {
  kpis: {
    totalOutstanding: number;
    overdueAmount: number;
    invoiceCount: number;
    averagePaymentDays: number;
  };
  aging: AgingReport;
  recentInvoices: {
    id: string;
    invoiceNumber: string;
    vendorName: string;
    amount: number;
    dueDate: string;
    status: string;
  }[];
}

const invoiceStatusColors: Record<string, string> = {
  RECEIVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  PAID: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function APDashboardPage() {
  const [data, setData] = useState<APDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/finance/aging?type=ap");
        if (res.ok) {
          const json = await res.json();
          const aging: AgingReport = json.data || json;
          const overdueAmount =
            aging.thirtyDays.totalAmount +
            aging.sixtyDays.totalAmount +
            aging.ninetyDays.totalAmount +
            aging.overNinety.totalAmount;
          const invoiceCount =
            aging.current.count +
            aging.thirtyDays.count +
            aging.sixtyDays.count +
            aging.ninetyDays.count +
            aging.overNinety.count;
          // Collect recent invoices from all buckets
          const allInvoices = [
            ...aging.current.invoices,
            ...aging.thirtyDays.invoices,
            ...aging.sixtyDays.invoices,
            ...aging.ninetyDays.invoices,
            ...aging.overNinety.invoices,
          ];
          setData({
            kpis: {
              totalOutstanding: aging.totalOutstanding,
              overdueAmount,
              invoiceCount,
              averagePaymentDays: 0,
            },
            aging,
            recentInvoices: allInvoices.slice(0, 10).map((inv) => ({
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
              vendorName: inv.vendorOrCustomer,
              amount: inv.amount,
              dueDate: inv.dueDate,
              status: inv.daysOverdue > 0 ? "OVERDUE" : "RECEIVED",
            })),
          });
        }
      } catch {
        setError("Failed to load payables data.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Accounts Payable</h1>
            <p className="text-sm text-muted-foreground">Manage vendor invoices and payments</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[350px] rounded-lg" />
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Total Outstanding",
      value: formatCurrency(data.kpis.totalOutstanding),
      icon: DollarSign,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Overdue Amount",
      value: formatCurrency(data.kpis.overdueAmount),
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/30",
    },
    {
      title: "Invoice Count",
      value: data.kpis.invoiceCount.toLocaleString(),
      icon: FileText,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: "Average Payment Days",
      value: `${data.kpis.averagePaymentDays} days`,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts Payable</h1>
          <p className="text-sm text-muted-foreground">Manage vendor invoices and payments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/finance/ap/vendors">
              <Building2 className="h-3.5 w-3.5" />
              Vendors
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/finance/ap/invoices">
              <FileText className="h-3.5 w-3.5" />
              Invoices
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.title}</p>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Aging Chart */}
      <AgingChart report={data.aging} title="AP Aging Report" />

      {/* Recent Invoices */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-semibold">Recent Invoices</h3>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finance/ap/invoices">
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Invoice #</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Vendor</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Due Date</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/finance/ap/invoices`} className="text-primary hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><span className="block truncate max-w-[180px]">{inv.vendorName}</span></td>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {formatCurrency(inv.amount)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(inv.dueDate), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        invoiceStatusColors[inv.status] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
              {data.recentInvoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No recent invoices
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
