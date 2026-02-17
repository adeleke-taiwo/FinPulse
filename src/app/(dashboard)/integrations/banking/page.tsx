"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConnectionCard } from "@/components/integrations/connection-card";
import { ArrowLeft, CreditCard, Banknote, Building2 } from "lucide-react";

interface BankingIntegration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "connected" | "disconnected" | "syncing" | "error";
  lastSync: string | null;
}

export default function BankingIntegrationsPage() {
  const [integrations, setIntegrations] = useState<BankingIntegration[]>([
    {
      id: "plaid",
      name: "Plaid",
      description: "Securely connect bank accounts for automated transaction import and balance tracking.",
      icon: <CreditCard className="h-5 w-5 text-green-600" />,
      status: "connected",
      lastSync: "2026-02-15T08:30:00Z",
    },
    {
      id: "stripe",
      name: "Stripe",
      description: "Payment processing integration for invoicing, subscriptions, and revenue tracking.",
      icon: <Banknote className="h-5 w-5 text-indigo-600" />,
      status: "disconnected",
      lastSync: null,
    },
    {
      id: "mercury",
      name: "Mercury",
      description: "Business banking integration for real-time balance and transaction syncing.",
      icon: <Building2 className="h-5 w-5 text-blue-600" />,
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
            <h1 className="text-2xl font-bold">Banking Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Connect bank accounts and payment processors
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
