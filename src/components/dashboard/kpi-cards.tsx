"use client";

import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import {
  DollarSign,
  Users,
  TrendingUp,
  Activity,
} from "lucide-react";

interface KPIData {
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
}

interface KPICardsProps {
  data: KPIData;
}

export function KPICards({ data }: KPICardsProps) {
  const cards = [
    {
      title: "Revenue",
      value: formatCurrency(data.revenue),
      change: data.changes.revenue,
      sparkData: data.sparklines.map((s) => s.revenue),
      icon: DollarSign,
      color: "var(--chart-1)",
    },
    {
      title: "Active Users",
      value: formatNumber(data.activeUsers),
      change: data.changes.activeUsers,
      sparkData: data.sparklines.map((s) => s.active_users),
      icon: Users,
      color: "var(--chart-3)",
    },
    {
      title: "Cash Flow",
      value: formatCurrency(data.cashFlow),
      change: data.changes.cashFlow,
      sparkData: data.sparklines.map((s) => s.profit),
      icon: Activity,
      color: "var(--chart-5)",
    },
    {
      title: "Growth Rate",
      value: formatPercent(data.growthRate),
      change: data.changes.growthRate,
      sparkData: data.sparklines.map((s) => s.growth_rate),
      icon: TrendingUp,
      color: "var(--chart-4)",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {card.title}
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {card.value}
              </p>
              <p
                className={`mt-1 text-xs font-medium ${
                  card.change >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {formatPercent(card.change)} vs prev period
              </p>
            </div>
            <div
              className="rounded-md p-2"
              style={{ backgroundColor: `color-mix(in srgb, ${card.color} 15%, transparent)` }}
            >
              <card.icon className="h-4 w-4" style={{ color: card.color }} />
            </div>
          </div>
          <div className="mt-3">
            <Sparkline data={card.sparkData} color={card.color} height={36} />
          </div>
        </Card>
      ))}
    </div>
  );
}
