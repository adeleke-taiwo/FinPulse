"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, toTitleCase } from "@/lib/utils";
import { format } from "date-fns";
import { Plus, FileText } from "lucide-react";
import Link from "next/link";

interface JournalLine {
  id: string;
  debit: number;
  credit: number;
  glAccount: { code: string; name: string };
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  status: string;
  lines: JournalLine[];
  createdBy: { firstName: string; lastName: string } | null;
  approvedBy: { firstName: string; lastName: string } | null;
}

interface JournalData {
  data: JournalEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const statusTabs = ["All", "DRAFT", "PENDING_APPROVAL", "APPROVED", "POSTED", "REVERSED"];

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "outline"> = {
  DRAFT: "outline",
  PENDING_APPROVAL: "warning",
  APPROVED: "default",
  POSTED: "success",
  REVERSED: "destructive",
};

export default function JournalEntriesPage() {
  const [data, setData] = useState<JournalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (statusFilter !== "All") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/finance/journal?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      setError("Failed to load journal entries.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function getTotalAmount(entry: JournalEntry): number {
    return entry.lines.reduce((sum, l) => sum + l.debit, 0);
  }

  const columns = [
    {
      key: "entryNumber",
      label: "Entry #",
      render: (row: Record<string, unknown>) => {
        const entry = row as unknown as JournalEntry;
        return (
          <Link
            href={`/finance/journal/${entry.id}`}
            className="font-mono text-primary hover:underline"
          >
            {entry.entryNumber}
          </Link>
        );
      },
    },
    {
      key: "date",
      label: "Date",
      render: (row: Record<string, unknown>) => {
        const entry = row as unknown as JournalEntry;
        return (
          <span className="text-sm text-muted-foreground">
            {format(new Date(entry.date), "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      key: "description",
      label: "Description",
      render: (row: Record<string, unknown>) => {
        const entry = row as unknown as JournalEntry;
        return (
          <span className="text-sm text-foreground truncate block max-w-xs">{entry.description}</span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row: Record<string, unknown>) => {
        const entry = row as unknown as JournalEntry;
        return (
          <Badge variant={statusVariant[entry.status] || "outline"}>
            {toTitleCase(entry.status)}
          </Badge>
        );
      },
    },
    {
      key: "amount",
      label: "Amount",
      render: (row: Record<string, unknown>) => {
        const entry = row as unknown as JournalEntry;
        return (
          <span className="font-mono text-sm font-medium tabular-nums">
            {formatCurrency(getTotalAmount(entry))}
          </span>
        );
      },
    },
    {
      key: "createdBy",
      label: "Created By",
      render: (row: Record<string, unknown>) => {
        const entry = row as unknown as JournalEntry;
        return entry.createdBy ? (
          <span className="text-sm text-muted-foreground">
            {entry.createdBy.firstName} {entry.createdBy.lastName}
          </span>
        ) : (
          <span className="text-muted-foreground">{"\u2014"}</span>
        );
      },
    },
  ];

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Journal Entries</h1>
            <p className="text-sm text-muted-foreground">General ledger journal entries</p>
          </div>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Journal Entries</h1>
          <p className="text-sm text-muted-foreground">
            {data?.total.toLocaleString() || 0} total entries
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/finance/journal/new">
            <Plus className="h-3 w-3" />
            New Journal Entry
          </Link>
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/30 p-1">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatusFilter(tab);
              setPage(1);
            }}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "All" ? "All" : toTitleCase(tab)}
          </button>
        ))}
      </div>

      {data && data.data.length === 0 ? (
        <div className="flex flex-col items-center py-12">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No journal entries found for this filter.
          </p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={(data?.data || []) as unknown as Record<string, unknown>[]}
            loading={loading}
          />
          {data && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
