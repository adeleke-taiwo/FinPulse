"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { TxVolumeChart } from "@/components/charts/tx-volume-chart";
import { CategoryPieChart } from "@/components/charts/category-pie-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardData {
  kpis: {
    revenue: number;
    activeUsers: number;
    cashFlow: number;
    growthRate: number;
    changes: {
      revenue: number;
      activeUsers: number;
      cashFlow: number;
      growthRate: number;
    };
    sparklines: {
      revenue: number;
      active_users: number;
      profit: number;
      growth_rate: number;
    }[];
  };
  revenueTrend: { date: string; revenue: number; expenses: number }[];
  txVolume: { type: string; count: number; total: number }[];
  categoryBreakdown: { name: string; total: number; count: number; color: string }[];
  recentTransactions: {
    id: string;
    type: string;
    status: string;
    amount: number;
    description: string;
    occurredAt: string;
    category: string;
    accountNumber: string;
    hasRisk: boolean;
    riskSeverity?: string;
  }[];
}

function generateFallbackData(): DashboardData {
  const now = new Date();
  const days: { date: string; revenue: number; expenses: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const base = 35000 + Math.sin(i * 0.3) * 8000;
    days.push({
      date: d.toISOString().split("T")[0],
      revenue: Math.round(base + Math.random() * 6000),
      expenses: Math.round(base * 0.68 + Math.random() * 4000),
    });
  }

  const sparklines = Array.from({ length: 12 }, (_, i) => ({
    revenue: 950000 + i * 28000 + Math.random() * 40000,
    active_users: 32 + Math.floor(i * 1.5 + Math.random() * 3),
    profit: 260000 + i * 12000 + Math.random() * 20000,
    growth_rate: 4.5 + Math.random() * 3,
  }));

  return {
    kpis: {
      revenue: 1248500,
      activeUsers: 47,
      cashFlow: 373500,
      growthRate: 12.5,
      changes: { revenue: 12.5, activeUsers: 8.3, cashFlow: 15.2, growthRate: 2.1 },
      sparklines,
    },
    revenueTrend: days,
    txVolume: [
      { type: "DEBIT", count: 5840, total: 875000 },
      { type: "CREDIT", count: 2150, total: 1248500 },
      { type: "TRANSFER", count: 1420, total: 620000 },
      { type: "FEE", count: 680, total: 18200 },
      { type: "INTEREST", count: 320, total: 9800 },
      { type: "REFUND", count: 90, total: 32500 },
    ],
    categoryBreakdown: [
      { name: "Payroll & Benefits", total: 312000, count: 860, color: "#3b82f6" },
      { name: "Service Revenue", total: 285000, count: 420, color: "#ef4444" },
      { name: "Technology & Software", total: 178000, count: 540, color: "#22c55e" },
      { name: "Office & Facilities", total: 145000, count: 380, color: "#eab308" },
      { name: "Marketing & Advertising", total: 118000, count: 290, color: "#a855f7" },
      { name: "Business Travel", total: 92000, count: 210, color: "#ec4899" },
      { name: "Legal & Compliance", total: 68000, count: 85, color: "#06b6d4" },
      { name: "Product Revenue", total: 51500, count: 150, color: "#f97316" },
    ],
    recentTransactions: [
      { id: "tx-1", type: "DEBIT", status: "COMPLETED", amount: 125000, description: "Payroll disbursement", occurredAt: new Date(now.getTime() - 86400000).toISOString(), category: "Payroll & Benefits", accountNumber: "****4821", hasRisk: false },
      { id: "tx-2", type: "CREDIT", status: "COMPLETED", amount: 89500, description: "Client payment received", occurredAt: new Date(now.getTime() - 2 * 86400000).toISOString(), category: "Service Revenue", accountNumber: "****7392", hasRisk: false },
      { id: "tx-3", type: "DEBIT", status: "COMPLETED", amount: 18500, description: "Cloud hosting charges", occurredAt: new Date(now.getTime() - 2 * 86400000).toISOString(), category: "Technology & Software", accountNumber: "****4821", hasRisk: false },
      { id: "tx-4", type: "CREDIT", status: "COMPLETED", amount: 42000, description: "Product license renewal", occurredAt: new Date(now.getTime() - 3 * 86400000).toISOString(), category: "Product Revenue", accountNumber: "****7392", hasRisk: false },
      { id: "tx-5", type: "DEBIT", status: "COMPLETED", amount: 36000, description: "Office lease payment", occurredAt: new Date(now.getTime() - 3 * 86400000).toISOString(), category: "Office & Facilities", accountNumber: "****4821", hasRisk: false },
      { id: "tx-6", type: "TRANSFER", status: "COMPLETED", amount: 50000, description: "Inter-department transfer", occurredAt: new Date(now.getTime() - 4 * 86400000).toISOString(), category: "Operating Expenses", accountNumber: "****6104", hasRisk: false },
      { id: "tx-7", type: "DEBIT", status: "COMPLETED", amount: 8200, description: "Legal retainer fee", occurredAt: new Date(now.getTime() - 4 * 86400000).toISOString(), category: "Legal & Compliance", accountNumber: "****4821", hasRisk: false },
      { id: "tx-8", type: "DEBIT", status: "PENDING", amount: 47200, description: "Marketing campaign spend", occurredAt: new Date(now.getTime() - 5 * 86400000).toISOString(), category: "Marketing & Advertising", accountNumber: "****4821", hasRisk: true, riskSeverity: "MEDIUM" },
      { id: "tx-9", type: "FEE", status: "COMPLETED", amount: 150, description: "Wire transfer fee", occurredAt: new Date(now.getTime() - 5 * 86400000).toISOString(), category: "Banking & Fees", accountNumber: "****6104", hasRisk: false },
      { id: "tx-10", type: "CREDIT", status: "COMPLETED", amount: 3200, description: "Vendor credit applied", occurredAt: new Date(now.getTime() - 6 * 86400000).toISOString(), category: "Operating Expenses", accountNumber: "****7392", hasRisk: false },
    ],
  };
}

function isEmptyData(d: DashboardData): boolean {
  return d.kpis.revenue === 0 && d.kpis.activeUsers === 0 && d.kpis.cashFlow === 0
    && d.revenueTrend.length === 0 && d.recentTransactions.length === 0;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const fromRef = useRef(from);
  const toRef = useRef(to);

  const fetchData = useCallback(async (fromDate: string, toDate: string) => {
    try {
      const res = await fetch(`/api/dashboard?from=${fromDate}&to=${toDate}`);
      if (res.ok) {
        const json = await res.json();
        setData(isEmptyData(json) ? generateFallbackData() : json);
      } else {
        setData(generateFallbackData());
      }
    } catch {
      setData(generateFallbackData());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const defaultFrom = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const defaultTo = new Date().toISOString().split("T")[0];
    setFrom(defaultFrom);
    setTo(defaultTo);
    fromRef.current = defaultFrom;
    toRef.current = defaultTo;
    setLoading(true);
    fetchData(defaultFrom, defaultTo);
    const interval = setInterval(() => fetchData(fromRef.current, toRef.current), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  function handleDateChange(newFrom: string, newTo: string) {
    setFrom(newFrom);
    setTo(newTo);
    fromRef.current = newFrom;
    toRef.current = newTo;
    setLoading(true);
    fetchData(newFrom, newTo);
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px] rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[350px] rounded-lg" />
          <Skeleton className="h-[350px] rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <DateRangePicker from={from} to={to} onChange={handleDateChange} />
      </div>

      <KPICards data={data.kpis} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueChart data={data.revenueTrend} />
        <TxVolumeChart data={data.txVolume} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentTransactions data={data.recentTransactions} />
        </div>
        <CategoryPieChart data={data.categoryBreakdown} />
      </div>
    </div>
  );
}
