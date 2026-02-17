"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConnectionCard } from "@/components/integrations/connection-card";
import { ArrowLeft, Users, Briefcase, Wallet } from "lucide-react";

interface HRIntegration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "connected" | "disconnected" | "syncing" | "error";
  lastSync: string | null;
}

export default function HRIntegrationsPage() {
  const [integrations, setIntegrations] = useState<HRIntegration[]>([
    {
      id: "bamboohr",
      name: "BambooHR",
      description: "Employee data sync including headcount, department assignments, and onboarding workflows.",
      icon: <Users className="h-5 w-5 text-green-600" />,
      status: "disconnected",
      lastSync: null,
    },
    {
      id: "workday",
      name: "Workday",
      description: "Enterprise HCM integration for workforce analytics, payroll, and benefits administration.",
      icon: <Briefcase className="h-5 w-5 text-orange-600" />,
      status: "disconnected",
      lastSync: null,
    },
    {
      id: "gusto",
      name: "Gusto",
      description: "Payroll and benefits platform integration for automated payroll journal entries.",
      icon: <Wallet className="h-5 w-5 text-rose-600" />,
      status: "disconnected",
      lastSync: null,
    },
  ]);

  function handleConnect(id: string) {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: "connected" as const, lastSync: new Date().toISOString() } : i
      )
    );
  }

  function handleDisconnect(id: string) {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: "disconnected" as const, lastSync: null } : i
      )
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/integrations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">HR Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Connect HR and payroll platforms
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {integrations.map((integration) => (
          <ConnectionCard
            key={integration.id}
            name={integration.name}
            description={integration.description}
            icon={integration.icon}
            status={integration.status}
            lastSync={integration.lastSync}
            onConnect={() => handleConnect(integration.id)}
            onDisconnect={() => handleDisconnect(integration.id)}
          />
        ))}
      </div>
    </div>
  );
}
