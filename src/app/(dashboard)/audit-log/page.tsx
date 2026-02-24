"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { maskPII } from "@/lib/utils";

interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { firstName: string; lastName: string; email: string; role: string } | null;
}

interface AuditData {
  data: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (actionFilter) params.set("action", actionFilter);
      if (resourceFilter) params.set("resource", resourceFilter);

      const res = await fetch(`/api/audit-log?${params}`);
      if (res.ok) setData(await res.json());
    } catch {
      setError("Failed to load audit log.");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, resourceFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = [
    {
      key: "createdAt",
      label: "Timestamp",
      render: (entry: Record<string, unknown>) =>
        format(new Date(entry.createdAt as string), "MMM d, yyyy HH:mm:ss"),
    },
    {
      key: "actor",
      label: "Actor",
      render: (entry: Record<string, unknown>) => {
        const actor = entry.actor as AuditEntry["actor"];
        return actor ? (
          <div>
            <span className="text-sm font-medium">
              {actor.firstName} {actor.lastName}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              {maskPII(actor.email)}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">System</span>
        );
      },
    },
    {
      key: "action",
      label: "Action",
      render: (entry: Record<string, unknown>) => (
        <Badge variant="outline">{entry.action as string}</Badge>
      ),
    },
    {
      key: "resource",
      label: "Resource",
      render: (entry: Record<string, unknown>) => (
        <span className="text-sm">{entry.resource as string}</span>
      ),
    },
    {
      key: "ipAddress",
      label: "IP Address",
      render: (entry: Record<string, unknown>) => (
        <span className="font-mono text-xs text-muted-foreground">
          {(entry.ipAddress as string) || "—"}
        </span>
      ),
    },
  ];

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          {data.total.toLocaleString()} entries
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
        >
          <option value="">All Actions</option>
          {["user.login", "user.create", "transaction.create", "transaction.export", "settings.update", "upload.process"].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={resourceFilter}
          onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
        >
          <option value="">All Resources</option>
          {["user", "transaction", "account", "settings", "upload"].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data.data as unknown as Record<string, unknown>[]}
        loading={loading}
      />
      <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
    </div>
  );
}
