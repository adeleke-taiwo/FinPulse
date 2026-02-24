"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { getSOXControls, type SOXControl } from "@/lib/compliance/sox-controls";
import { toTitleCase } from "@/lib/utils";

const statusConfig: Record<
  SOXControl["status"],
  { icon: typeof CheckCircle; color: string; variant: "success" | "destructive" | "warning" | "default" }
> = {
  pass: { icon: CheckCircle, color: "text-green-600", variant: "success" },
  fail: { icon: XCircle, color: "text-destructive", variant: "destructive" },
  warning: { icon: AlertTriangle, color: "text-amber-600", variant: "warning" },
  not_tested: { icon: ShieldCheck, color: "text-muted-foreground", variant: "default" },
};

export default function SOXPage() {
  const controls = getSOXControls();

  // Group controls by category
  const grouped = controls.reduce<Record<string, SOXControl[]>>((acc, control) => {
    if (!acc[control.category]) acc[control.category] = [];
    acc[control.category].push(control);
    return acc;
  }, {});

  const categories = Object.keys(grouped);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/compliance">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">SOX Controls</h1>
            <p className="text-sm text-muted-foreground">
              {controls.length} controls across {categories.length} categories
            </p>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex gap-4">
        {(["pass", "fail", "warning", "not_tested"] as const).map((status) => {
          const count = controls.filter((c) => c.status === status).length;
          const cfg = statusConfig[status];
          return (
            <div key={status} className="flex items-center gap-1.5">
              <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
              <span className="text-sm font-medium">{count}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {toTitleCase(status)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Grouped Controls */}
      {categories.map((category) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-20">
                      ID
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Control Name
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground w-24">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">
                      Last Tested
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[category].map((control) => {
                    const cfg = statusConfig[control.status];
                    const StatusIcon = cfg.icon;
                    return (
                      <tr
                        key={control.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                          {control.id}
                        </td>
                        <td className="px-3 py-2.5 font-medium">{control.name}</td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-md">
                          {control.description}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center">
                            <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {control.lastTested
                            ? new Date(control.lastTested).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Not tested"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
