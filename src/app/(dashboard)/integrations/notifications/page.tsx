"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConnectionCard } from "@/components/integrations/connection-card";
import { ArrowLeft, MessageSquare, Video, Webhook, Copy, CheckCircle } from "lucide-react";

interface NotificationIntegration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "connected" | "disconnected" | "syncing" | "error";
  lastSync: string | null;
}

export default function NotificationsIntegrationsPage() {
  const [integrations, setIntegrations] = useState<NotificationIntegration[]>([
    {
      id: "slack",
      name: "Slack",
      description: "Send approval notifications, expense alerts, and financial reports to Slack channels.",
      icon: <MessageSquare className="h-5 w-5 text-purple-600" />,
      status: "connected",
      lastSync: "2026-02-15T10:00:00Z",
    },
    {
      id: "teams",
      name: "Microsoft Teams",
      description: "Integration with Teams for workflow notifications and approval requests via adaptive cards.",
      icon: <Video className="h-5 w-5 text-blue-600" />,
      status: "disconnected",
      lastSync: null,
    },
  ]);

  const [webhookUrl, setWebhookUrl] = useState("https://hooks.finpulse.io/wh/org_abc123");
  const [copied, setCopied] = useState(false);

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

  function handleCopyWebhook() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <h1 className="text-2xl font-bold">Notification Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Configure messaging and alert integrations
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

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Webhook Configuration</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use this webhook URL to receive real-time event notifications from FinPulse.
              Events include invoice approvals, expense submissions, budget alerts, and more.
            </p>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Webhook URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                  readOnly
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyWebhook}
                >
                  {copied ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Events
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  "invoice.approved",
                  "expense.submitted",
                  "budget.threshold",
                  "payment.processed",
                  "approval.required",
                ].map((event) => (
                  <span
                    key={event}
                    className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-mono"
                  >
                    {event}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
