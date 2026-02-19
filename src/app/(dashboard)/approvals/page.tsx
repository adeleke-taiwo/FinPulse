"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import {
  CheckCircle,
  XCircle,
  Clock,
  ClipboardList,
} from "lucide-react";

interface ApprovalItem {
  id: string;
  type: "Expense" | "Journal" | "Invoice";
  description: string;
  amount: number;
  submittedBy: { firstName: string; lastName: string };
  submittedAt: string;
  stepName: string;
  entityId: string;
}

interface ApprovalsData {
  data: ApprovalItem[];
  total: number;
  pendingCount: number;
  page: number;
  totalPages: number;
}

const typeColors: Record<string, string> = {
  Expense: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Journal: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Invoice: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function ApprovalsPage() {
  const [data, setData] = useState<ApprovalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      const res = await fetch(`/api/approvals?${params}`);
      if (res.ok) {
        const json = await res.json();
        const raw = json.data || [];

        const typeMap: Record<string, "Expense" | "Journal" | "Invoice"> = {
          EXPENSE_APPROVAL: "Expense",
          JOURNAL_APPROVAL: "Journal",
          INVOICE_APPROVAL: "Invoice",
          VENDOR_ONBOARDING: "Invoice",
        };

        const items: ApprovalItem[] = raw.map(
          (r: {
            instanceId: string;
            templateType: string;
            templateName: string;
            resourceId: string;
            amount?: number;
            submittedBy: { firstName: string; lastName: string };
            createdAt: string;
            currentStep: number;
            steps?: { stepOrder: number; name: string }[];
          }) => {
            const stepName =
              r.steps?.find((s) => s.stepOrder === r.currentStep)?.name ||
              `Step ${r.currentStep}`;
            return {
              id: r.instanceId,
              type: typeMap[r.templateType] || "Expense",
              description: r.templateName || "Approval Request",
              amount: r.amount || 0,
              submittedBy: r.submittedBy || { firstName: "Unknown", lastName: "" },
              submittedAt: r.createdAt || new Date().toISOString(),
              stepName,
              entityId: r.resourceId,
            };
          }
        );

        setData({
          data: items,
          total: json.total || 0,
          pendingCount: json.total || 0,
          page: json.page || 1,
          totalPages: json.totalPages || 1,
        });
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!data) return;
    if (selectedIds.size === data.data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.data.map((item) => item.id)));
    }
  }

  async function handleAction(id: string, action: "approve" | "reject") {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/approvals/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comments[id] || "" }),
      });
      if (res.ok) {
        fetchApprovals();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBulkApprove() {
    setActionLoading("bulk");
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/approvals/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fetchApprovals();
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  }

  const columns = [
    {
      key: "select",
      label: "",
      render: (row: Record<string, unknown>) => {
        const item = row as unknown as ApprovalItem;
        return (
          <input
            type="checkbox"
            checked={selectedIds.has(item.id)}
            onChange={() => toggleSelected(item.id)}
            className="h-4 w-4 rounded border-border"
          />
        );
      },
    },
    {
      key: "type",
      label: "Type",
      render: (row: Record<string, unknown>) => {
        const item = row as unknown as ApprovalItem;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              typeColors[item.type] || "bg-gray-100 text-gray-800"
            }`}
          >
            {item.type}
          </span>
        );
      },
    },
    {
      key: "description",
      label: "Description",
      render: (row: Record<string, unknown>) => {
        const item = row as unknown as ApprovalItem;
        return (
          <span className="text-sm font-medium text-foreground">{item.description}</span>
        );
      },
    },
    {
      key: "amount",
      label: "Amount",
      render: (row: Record<string, unknown>) => {
        const item = row as unknown as ApprovalItem;
        return <span className="font-mono tabular-nums">{formatCurrency(item.amount)}</span>;
      },
    },
    {
      key: "submittedBy",
      label: "Submitted By",
      render: (row: Record<string, unknown>) => {
        const item = row as unknown as ApprovalItem;
        return (
          <span className="text-sm">
            {item.submittedBy.firstName} {item.submittedBy.lastName}
          </span>
        );
      },
    },
    {
      key: "submittedAt",
      label: "Submitted",
      render: (row: Record<string, unknown>) => {
        const item = row as unknown as ApprovalItem;
        let dateStr = "";
        try {
          dateStr = format(new Date(item.submittedAt), "MMM d, yyyy");
        } catch {
          dateStr = item.submittedAt || "—";
        }
        return (
          <span className="text-sm text-muted-foreground">{dateStr}</span>
        );
      },
    },
    {
      key: "stepName",
      label: "Step",
      render: (row: Record<string, unknown>) => {
        const item = row as unknown as ApprovalItem;
        return (
          <span className="text-xs text-muted-foreground">{item.stepName}</span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: Record<string, unknown>) => {
        const item = row as unknown as ApprovalItem;
        const isProcessing = actionLoading === item.id;
        return (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAction(item.id, "approve")}
              disabled={isProcessing}
              className="h-7 px-2 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20"
            >
              <CheckCircle className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAction(item.id, "reject")}
              disabled={isProcessing}
              className="h-7 px-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Approvals</h1>
            <p className="text-sm text-muted-foreground">Review pending approval requests</p>
          </div>
        </div>
        <Skeleton className="h-[100px] rounded-lg" />
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approvals</h1>
          <p className="text-sm text-muted-foreground">Review pending approval requests</p>
        </div>
        {selectedIds.size > 0 && (
          <Button
            size="sm"
            onClick={handleBulkApprove}
            disabled={actionLoading === "bulk"}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Approve Selected ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Pending Count Card */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {data?.pendingCount || 0}
            </p>
            <p className="text-sm text-muted-foreground">Pending Approvals</p>
          </div>
        </CardContent>
      </Card>

      {/* Select All */}
      {data && data.data.length > 0 && (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectedIds.size === data.data.length && data.data.length > 0}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-border"
          />
          <span className="text-sm text-muted-foreground">Select all</span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={(data?.data || []) as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No pending approvals"
      />

      {/* Inline comment boxes for each visible item */}
      {data && data.data.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            <ClipboardList className="mr-1 inline h-3 w-3" />
            Add comments for individual items before approving or rejecting:
          </p>
          {data.data.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="w-32 truncate text-xs text-muted-foreground">{item.description}</span>
              <input
                type="text"
                value={comments[item.id] || ""}
                onChange={(e) =>
                  setComments((prev) => ({ ...prev, [item.id]: e.target.value }))
                }
                placeholder="Add comment..."
                className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}

      {data && (
        <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
