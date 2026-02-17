import Link from "next/link";
import { Card } from "@/components/ui/card";
import { TrendingUp, Users, Target, AlertTriangle } from "lucide-react";

const analyticsPages = [
  {
    title: "Revenue Analytics",
    description: "Time-series revenue analysis with daily, weekly, and monthly granularity. Cash flow tracking and drill-down capabilities.",
    href: "/analytics/revenue",
    icon: TrendingUp,
    color: "text-chart-1",
  },
  {
    title: "Cohort Retention",
    description: "User retention heatmap matrix showing cohort behavior over time. Churn rate analysis and trends.",
    href: "/analytics/cohorts",
    icon: Users,
    color: "text-chart-3",
  },
  {
    title: "Financial KPIs",
    description: "ARPU, LTV, CAC, Profit Margin cards with trend sparklines. Growth rate and retention tracking.",
    href: "/analytics/kpis",
    icon: Target,
    color: "text-chart-5",
  },
  {
    title: "Anomaly Detection",
    description: "Z-score based anomaly detection. Scatter plot visualization and flagged transaction analysis.",
    href: "/analytics/anomalies",
    icon: AlertTriangle,
    color: "text-chart-4",
  },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {analyticsPages.map((page) => (
          <Link key={page.href} href={page.href}>
            <Card className="transition-shadow hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className={`rounded-lg bg-muted p-3 ${page.color}`}>
                  <page.icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {page.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {page.description}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
