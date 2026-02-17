"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  Landmark,
  BookOpen,
  Users,
  Bell,
  ArrowRight,
  CreditCard,
  FileSpreadsheet,
  Building2,
  MessageSquare,
} from "lucide-react";

const integrationCategories = [
  {
    title: "Banking",
    description: "Connect bank accounts and payment processors for automated transaction syncing.",
    href: "/integrations/banking",
    icon: Landmark,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    services: ["Plaid", "Stripe", "Mercury"],
  },
  {
    title: "Accounting",
    description: "Sync with accounting platforms for automated bookkeeping and reconciliation.",
    href: "/integrations/accounting",
    icon: BookOpen,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
    services: ["QuickBooks", "Xero", "Sage"],
  },
  {
    title: "HR",
    description: "Connect HR platforms for employee data, payroll, and benefits integration.",
    href: "/integrations/hr",
    icon: Users,
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    services: ["BambooHR", "Workday", "Gusto"],
  },
  {
    title: "Notifications",
    description: "Set up messaging integrations for alerts, approvals, and workflow notifications.",
    href: "/integrations/notifications",
    icon: Bell,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    services: ["Slack", "Microsoft Teams"],
  },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Connect third-party services to FinPulse
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {integrationCategories.map((category) => (
          <Link key={category.href} href={category.href}>
            <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-3 ${category.bg}`}>
                    <category.icon className={`h-6 w-6 ${category.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{category.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {category.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {category.services.map((service) => (
                        <span
                          key={service}
                          className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
