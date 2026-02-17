"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { formatCurrency, toTitleCase } from "@/lib/utils";
import { format } from "date-fns";
import { Download, Filter, Radio } from "lucide-react";
import Link from "next/link";

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  occurredAt: string;
  category: { name: string; color: string } | null;
  fromAccount: { accountNumber: string; type: string } | null;
  riskFlags: { severity: string; riskScore: number; status: string; ruleTriggered: string }[];
}

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive"> = {
  COMPLETED: "success",
  PENDING: "warning",
  FAILED: "destructive",
  REVERSED: "destructive",
};

export default function TransactionsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role || "USER";
  const canExport = ["ADMIN", "ANALYST"].includes(userRole);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("occurredAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [sseFeed, setSseFeed] = useState<{ id: string; type: string; amount: number; category: string }[]>([]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sortBy,
        sortOrder,
        from,
        to,
      });
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/transactions?${params}`);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data);
        setTotalPages(json.totalPages);
        setTotal(json.total);
      } else {
        setError("Failed to load transactions");
      }
    } catch {
      setError("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, typeFilter, statusFilter, from, to]);

  useEffect(() => {
    if (!from || !to) {
      const defaultFrom = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
      const defaultTo = new Date().toISOString().split("T")[0];
      setFrom(defaultFrom);
      setTo(defaultTo);
      return;
    }
    fetchTransactions();
  }, [fetchTransactions, from, to]);

  // SSE real-time feed
  useEffect(() => {
    const eventSource = new EventSource("/api/transactions/sse");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setSseFeed((prev) => {
          const merged = [...data, ...prev];
          const seen = new Set<string>();
          return merged.filter((tx: { id: string }) => {
            if (seen.has(tx.id)) return false;
            seen.add(tx.id);
            return true;
          }).slice(0, 5);
        });
      } catch { /* ignore */ }
    };
    return () => eventSource.close();
  }, []);

  function handleSort(key: string) {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
    setPage(1);
  }

  async function handleExport(format: string) {
    const params = new URLSearchParams({ format, from, to });
    if (format === "csv") {
      window.open(`/api/transactions/export?${params}`, "_blank");
    }
  }

  const columns = [
    {
      key: "occurredAt",
      label: "Date",
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const tx = row as unknown as Transaction;
        return (
          <Link href={`/transactions/${tx.id}`} className="text-primary hover:underline">
            {format(new Date(tx.occurredAt), "MMM d, yyyy HH:mm")}
          </Link>
        );
      },
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const tx = row as unknown as Transaction;
        return (
          <Badge variant={tx.type === "CREDIT" ? "success" : tx.type === "DEBIT" ? "destructive" : "default"}>
            {toTitleCase(tx.type)}
          </Badge>
        );
      },
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const tx = row as unknown as Transaction;
        return (
          <span className={`font-medium ${tx.type === "CREDIT" ? "text-success" : ""}`}>
            {formatCurrency(tx.amount)}
          </span>
        );
      },
    },
    {
      key: "category",
      label: "Category",
      render: (row: Record<string, unknown>) => {
        const tx = row as unknown as Transaction;
        return tx.category?.name || "\u2014";
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const tx = row as unknown as Transaction;
        return (
          <Badge variant={statusVariant[tx.status] || "default"}>
            {toTitleCase(tx.status)}
          </Badge>
        );
      },
    },
    {
      key: "account",
      label: "Account",
      render: (row: Record<string, unknown>) => {
        const tx = row as unknown as Transaction;
        return tx.fromAccount ? `***${tx.fromAccount.accountNumber.slice(-4)}` : "\u2014";
      },
    },
    {
      key: "risk",
      label: "Risk",
      render: (row: Record<string, unknown>) => {
        const tx = row as unknown as Transaction;
        if (!tx.riskFlags || tx.riskFlags.length === 0) {
          return <span className="text-xs text-green-600 dark:text-green-400">Clean</span>;
        }
        const highest = tx.riskFlags.reduce((a, b) => (b.riskScore > a.riskScore ? b : a));
        const severityColor: Record<string, string> = {
          CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
          HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
          MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
          LOW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        };
        return (
          <div className="flex flex-col gap-0.5">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${severityColor[highest.severity] || ""}`}>
              {toTitleCase(highest.severity)}
              <span className="opacity-70">({highest.riskScore.toFixed(0)})</span>
            </span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
              {toTitleCase(highest.ruleTriggered)}
            </span>
            {tx.riskFlags.length > 1 && (
              <span className="text-[10px] text-muted-foreground">+{tx.riskFlags.length - 1} more</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
              <Download className="h-3 w-3" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* SSE Live Feed */}
      {sseFeed.length > 0 && (
        <div className="flex items-center gap-2 overflow-hidden rounded-lg border border-border bg-card px-4 py-2">
          <Radio className="h-3 w-3 animate-pulse text-success" />
          <span className="text-xs font-medium text-muted-foreground">Live:</span>
          <div className="flex gap-3 overflow-x-auto">
            {sseFeed.map((tx) => (
              <span key={tx.id} className="whitespace-nowrap text-xs text-foreground">
                {toTitleCase(tx.type)} • {formatCurrency(tx.amount)} • {tx.category}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
        >
          <option value="">All Types</option>
          {["CREDIT", "DEBIT", "TRANSFER", "FEE", "INTEREST", "REFUND"].map((t) => (
            <option key={t} value={t}>{toTitleCase(t)}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
        >
          <option value="">All Status</option>
          {["COMPLETED", "PENDING", "FAILED", "REVERSED"].map((s) => (
            <option key={s} value={s}>{toTitleCase(s)}</option>
          ))}
        </select>
        <DateRangePicker
          from={from}
          to={to}
          onChange={(f, t) => { setFrom(f); setTo(t); setPage(1); }}
        />
      </div>

      <DataTable
        columns={columns}
        data={transactions as unknown as Record<string, unknown>[]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        loading={loading}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
