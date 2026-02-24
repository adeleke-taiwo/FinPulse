"use client";

import { Check, X, Loader2 } from "lucide-react";

interface ConnectionCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "connected" | "disconnected" | "syncing" | "error";
  lastSync?: string | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function ConnectionCard({
  name,
  description,
  icon,
  status,
  lastSync,
  onConnect,
  onDisconnect,
}: ConnectionCardProps) {
  const statusConfig = {
    connected: {
      label: "Connected",
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/30",
      icon: <Check className="h-3 w-3" />,
    },
    disconnected: {
      label: "Not Connected",
      color: "text-muted-foreground",
      bg: "bg-muted",
      icon: <X className="h-3 w-3" />,
    },
    syncing: {
      label: "Syncing...",
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/30",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    error: {
      label: "Error",
      color: "text-destructive",
      bg: "bg-red-100 dark:bg-red-900/30",
      icon: <X className="h-3 w-3" />,
    },
  };

  const s = statusConfig[status];

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{name}</h3>
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.color} ${s.bg}`}>
              {s.icon}
              {s.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          {lastSync && (
            <p className="mt-1 text-xs text-muted-foreground">
              Last sync: {new Date(lastSync).toLocaleString()}
            </p>
          )}
        </div>
        <div>
          {status === "disconnected" ? (
            <button
              onClick={onConnect}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Connect
            </button>
          ) : status === "connected" ? (
            <button
              onClick={onDisconnect}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              Disconnect
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
