"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency, toTitleCase } from "@/lib/utils";
import { format } from "date-fns";
import { Plus, Receipt, Filter } from "lucide-react";
import Link from "next/link";

interface Expense {
  id: string;
  title: string;
  amount: number;
  categorySlug: string;
  occurredAt: string;
  status: string;
  submittedBy?: { firstName: string; lastName: string };
}

interface ExpenseData {
  data: Expense[];
  total: number;
  page: number;
  totalPages: number;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  REIMBURSED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

const STATUSES = ["DRAFT", "SUBMITTED", "PENDING_APPROVAL", "APPROVED", "REJECTED", "REIMBURSED"];

export default function ExpensesPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role || "USER";
  const isManager = ["ADMIN", "MANAGER", "CFO"].includes(userRole);

  const [tab, setTab] = useState<"my" | "team">("my");
  const [expenses, setExpenses] = useState<ExpenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
      scope: tab,
    });
    if (statusFilter) params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/expenses?${params}`);
      if (res.ok) setExpenses(await res.json());
    } catch {
      setError("Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [page, tab, statusFilter]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const columns = [
    {
      key: "title",
      label: "Title",
      render: (row: Record<string, unknown>) => {
        const expense = row as unknown as Expense;
        return (
          <Link href={`/expenses/${expense.id}`} className="text-primary hover:underline font-medium truncate block max-w-[250px]">
            {expense.title}
          </Link>
        );
      },
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const expense = row as unknown as Expense;
        return <span className="font-mono tabular-nums">{formatCurrency(expense.amount)}</span>;
      },
    },
    {
      key: "categorySlug",
      label: "Category",
      render: (row: Record<string, unknown>) => {
        const expense = row as unknown as Expense;
        return (
          <span className="text-sm capitalize">
            {toTitleCase(expense.categorySlug)}
          </span>
        );
      },
    },
    {
      key: "occurredAt",
      label: "Date",
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const expense = row as unknown as Expense;
        return format(new Date(expense.occurredAt), "MMM d, yyyy");
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row: Record<string, unknown>) => {
        const expense = row as unknown as Expense;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              statusColors[expense.status] || "bg-gray-100 text-gray-800"
            }`}
          >
            {toTitleCase(expense.status)}
          </span>
        );
      },
    },
    ...(tab === "team"
      ? [
          {
            key: "submittedBy",
            label: "Submitted By",
            render: (row: Record<string, unknown>) => {
              const expense = row as unknown as Expense;
              return expense.submittedBy
                ? `${expense.submittedBy.firstName} ${expense.submittedBy.lastName}`
                : "\u2014";
            },
          },
        ]
      : []),
  ];

  if (loading && !expenses) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Expenses</h1>
            <p className="text-sm text-muted-foreground">Track and manage expense reports</p>
          </div>
        </div>
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            {expenses?.total.toLocaleString() || 0} expense reports
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/expenses/new">
            <Plus className="h-3.5 w-3.5" />
            New Expense
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-border">
        <button
          onClick={() => { setTab("my"); setPage(1); }}
          className={`pb-2 text-sm font-medium transition-colors ${
            tab === "my"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Receipt className="mr-1.5 inline h-3.5 w-3.5" />
          My Expenses
        </button>
        {isManager && (
          <button
            onClick={() => { setTab("team"); setPage(1); }}
            className={`pb-2 text-sm font-medium transition-colors ${
              tab === "team"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Team Expenses
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{toTitleCase(s)}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={(expenses?.data || []) as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No expenses found"
      />

      {expenses && (
        <Pagination page={expenses.page} totalPages={expenses.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
