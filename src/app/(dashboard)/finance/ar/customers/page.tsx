"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Plus, ArrowLeft, X, Users } from "lucide-react";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  code: string;
  email: string;
  creditLimit: number;
  paymentTerms: string;
}

interface CustomersData {
  data: Customer[];
  total: number;
  page: number;
  totalPages: number;
}

export default function CustomersPage() {
  const [data, setData] = useState<CustomersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCreditLimit, setFormCreditLimit] = useState("");
  const [formPaymentTerms, setFormPaymentTerms] = useState("NET_30");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      const res = await fetch(`/api/finance/customers?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData({
          data: json.data || [],
          total: json.total || json.data?.length || 0,
          page: json.page || 1,
          totalPages: json.totalPages || 1,
        });
      }
    } catch {
      setError("Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/finance/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          code: formCode,
          email: formEmail,
          creditLimit: parseFloat(formCreditLimit) || 0,
          paymentTerms: formPaymentTerms,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setFormName("");
        setFormCode("");
        setFormEmail("");
        setFormCreditLimit("");
        setFormPaymentTerms("NET_30");
        fetchCustomers();
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.error || "Failed to add customer");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: "name",
      label: "Customer Name",
      render: (row: Record<string, unknown>) => {
        const customer = row as unknown as Customer;
        return (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{customer.name}</span>
          </div>
        );
      },
    },
    {
      key: "code",
      label: "Code",
      render: (row: Record<string, unknown>) => {
        const customer = row as unknown as Customer;
        return <span className="font-mono text-xs">{customer.code}</span>;
      },
    },
    {
      key: "email",
      label: "Email",
      render: (row: Record<string, unknown>) => {
        const customer = row as unknown as Customer;
        return <span className="text-sm text-muted-foreground">{customer.email}</span>;
      },
    },
    {
      key: "creditLimit",
      label: "Credit Limit",
      render: (row: Record<string, unknown>) => {
        const customer = row as unknown as Customer;
        return (
          <span className="font-mono tabular-nums">
            {customer.creditLimit != null ? formatCurrency(customer.creditLimit) : "-"}
          </span>
        );
      },
    },
    {
      key: "paymentTerms",
      label: "Payment Terms",
      render: (row: Record<string, unknown>) => {
        const customer = row as unknown as Customer;
        const days = Number(customer.paymentTerms);
        const label = days === 0 ? "Due on Receipt" : `Net ${days}`;
        return <span className="text-sm">{label}</span>;
      },
    },
  ];

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-sm text-muted-foreground">Manage customer accounts</p>
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
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-sm text-muted-foreground">
              {data?.total || 0} customers
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? "Cancel" : "Add Customer"}
        </Button>
      </div>

      {/* Inline Add Customer Form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold">Add New Customer</h3>
          {error && (
            <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <form onSubmit={handleAddCustomer} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="Customer name"
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Code</label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                required
                placeholder="C-001"
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
                placeholder="customer@example.com"
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Credit Limit ($)</label>
              <input
                type="number"
                value={formCreditLimit}
                onChange={(e) => setFormCreditLimit(e.target.value)}
                min="0"
                step="100"
                placeholder="10000"
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Payment Terms</label>
              <select
                value={formPaymentTerms}
                onChange={(e) => setFormPaymentTerms(e.target.value)}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="NET_15">Net 15</option>
                <option value="NET_30">Net 30</option>
                <option value="NET_45">Net 45</option>
                <option value="NET_60">Net 60</option>
                <option value="NET_90">Net 90</option>
                <option value="DUE_ON_RECEIPT">Due on Receipt</option>
              </select>
            </div>
            <div className="flex items-end lg:col-span-5">
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Saving..." : "Save Customer"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <DataTable
        columns={columns}
        data={(data?.data || []) as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No customers found"
      />

      {data && (
        <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
