"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, toTitleCase } from "@/lib/utils";
import { format } from "date-fns";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  dueDate: string;
  status: string;
}

interface InvoicesData {
  data: CustomerInvoice[];
  total: number;
  page: number;
  totalPages: number;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  PARTIALLY_PAID: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  VOID: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const STATUS_TABS = ["All", "DRAFT", "SENT", "PAID", "OVERDUE", "PARTIALLY_PAID"];

export default function ARInvoicesPage() {
  const [data, setData] = useState<InvoicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState("All");
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (statusTab !== "All") params.set("status", statusTab);

      const res = await fetch(`/api/finance/customer-invoices?${params}`);
      if (res.ok) setData(await res.json());
    } catch {
      setError("Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  }, [page, statusTab]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const columns = [
    {
      key: "invoiceNumber",
      label: "Invoice #",
      render: (row: Record<string, unknown>) => {
        const inv = row as unknown as CustomerInvoice;
        return (
          <span className="font-mono text-sm font-medium text-primary">{inv.invoiceNumber}</span>
        );
      },
    },
    {
      key: "customerName",
      label: "Customer",
      render: (row: Record<string, unknown>) => {
        const inv = row as unknown as CustomerInvoice;
        return <span className="text-sm">{inv.customerName}</span>;
      },
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const inv = row as unknown as CustomerInvoice;
        return (
          <span className="font-mono tabular-nums font-semibold">
            {formatCurrency(inv.amount)}
          </span>
        );
      },
    },
    {
      key: "dueDate",
      label: "Due Date",
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const inv = row as unknown as CustomerInvoice;
        return (
          <span className="text-sm text-muted-foreground">
            {format(new Date(inv.dueDate), "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row: Record<string, unknown>) => {
        const inv = row as unknown as CustomerInvoice;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              statusColors[inv.status] || "bg-gray-100 text-gray-800"
            }`}
          >
            {toTitleCase(inv.status)}
          </span>
        );
      },
    },
  ];

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Customer Invoices</h1>
            <p className="text-sm text-muted-foreground">Manage AR invoices</p>
          </div>
        </div>
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finance/ar">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Customer Invoices</h1>
            <p className="text-sm text-muted-foreground">
              {data?.total || 0} invoices
            </p>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link href="/finance/ar/invoices/new">
            <Plus className="h-3.5 w-3.5" />
            New Invoice
          </Link>
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-4 overflow-x-auto border-b border-border">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setStatusTab(tab); setPage(1); }}
            className={`whitespace-nowrap pb-2 text-sm font-medium transition-colors ${
              statusTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "All" ? "All" : toTitleCase(tab)}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={(data?.data || []) as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No invoices found"
      />

      {data && (
        <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
