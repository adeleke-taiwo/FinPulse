"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { getSOXSummary } from "@/lib/compliance/sox-controls";

export default function CompliancePage() {
  const summary = getSOXSummary();

  const { total, pass, fail, warning, complianceRate } = summary;

  const quickStats = [
    { label: "Total Controls", value: total, icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { label: "Pass", value: pass, icon: CheckCircle, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
    { label: "Fail", value: fail, icon: XCircle, color: "text-destructive", bg: "bg-red-100 dark:bg-red-900/30" },
    { label: "Warning", value: warning, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
  ];

  // SVG circle parameters for the compliance score gauge
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (complianceRate / 100) * circumference;
  const scoreColor =
    complianceRate >= 90
      ? "stroke-green-500"
      : complianceRate >= 70
        ? "stroke-amber-500"
        : "stroke-destructive";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compliance</h1>
          <p className="text-sm text-muted-foreground">SOX Compliance Monitoring and Controls</p>
        </div>
      </div>

      {/* SOX Compliance Score */}
      <Card>
        <CardContent>
          <div className="flex flex-col items-center gap-4 md:flex-row md:gap-8">
            <div className="relative flex items-center justify-center">
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-muted"
                />
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="none"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                  strokeLinecap="round"
                  className={scoreColor}
                  transform="rotate(-90 90 90)"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold">{complianceRate}%</span>
                <span className="text-xs text-muted-foreground">SOX Score</span>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">SOX Compliance Overview</h2>
                <p className="text-sm text-muted-foreground">
                  {complianceRate >= 90
                    ? "Strong compliance posture. All critical controls are passing."
                    : complianceRate >= 70
                      ? "Good compliance with some areas needing attention."
                      : "Compliance needs improvement. Address failing controls immediately."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <div className={`rounded-md p-1.5 ${stat.bg}`}>
                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-xl font-bold">{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link href="/compliance/sox">
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-100 p-3 dark:bg-indigo-900/30">
                  <ShieldCheck className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold">SOX Controls Checklist</h3>
                  <p className="text-sm text-muted-foreground">
                    View detailed control test results by category
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>

        <Link href="/compliance/sod">
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Segregation of Duties</h3>
                  <p className="text-sm text-muted-foreground">
                    Review SoD conflict matrix across roles
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
