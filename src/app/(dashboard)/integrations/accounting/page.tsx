"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConnectionCard } from "@/components/integrations/connection-card";
import { ArrowLeft, BookOpen, FileSpreadsheet, Calculator } from "lucide-react";

interface AccountingIntegration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "connected" | "disconnected" | "syncing" | "error";
  lastSync: string | null;
}

export default function AccountingIntegrationsPage() {
  const [integrations, setIntegrations] = useState<AccountingIntegration[]>([
    {
      id: "quickbooks",
      name: "QuickBooks",
      description: "Sync chart of accounts, journal entries, and financial reports with QuickBooks Online.",
      icon: <BookOpen className="h-5 w-5 text-green-600" />,
      status: "connected",
      lastSync: "2026-02-14T22:00:00Z",
    },
    {
      id: "xero",
      name: "Xero",
      description: "Cloud accounting integration for invoicing, bank reconciliation, and reporting.",
      icon: <FileSpreadsheet className="h-5 w-5 text-blue-600" />,
      status: "disconnected",
      lastSync: null,
    },
    {
      id: "sage",
      name: "Sage",
      description: "Enterprise accounting integration for GL sync, AP/AR, and financial consolidation.",
      icon: <Calculator className="h-5 w-5 text-emerald-600" />,
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
            <h1 className="text-2xl font-bold">Accounting Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Sync with accounting platforms
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
