"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  ArrowLeft,
  X,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { toTitleCase } from "@/lib/utils";

interface Vendor {
  id: string;
  name: string;
  code: string;
  email: string;
  paymentTerms: string;
  riskScore: number;
  status: "ACTIVE" | "INACTIVE";
}

interface VendorsData {
  data: Vendor[];
  total: number;
  page: number;
  totalPages: number;
}

export default function VendorsPage() {
  const [data, setData] = useState<VendorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPaymentTerms, setFormPaymentTerms] = useState("NET_30");
  const [formRiskScore, setFormRiskScore] = useState(25);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      const res = await fetch(`/api/finance/vendors?${params}`);
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
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  async function handleAddVendor(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/finance/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          code: formCode,
          email: formEmail,
          paymentTerms: formPaymentTerms,
          riskScore: formRiskScore,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setFormName("");
        setFormCode("");
        setFormEmail("");
        setFormPaymentTerms("NET_30");
        setFormRiskScore(25);
        fetchVendors();
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.error || "Failed to add vendor");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function getRiskColor(score: number): string {
    if (score >= 80) return "text-red-600 dark:text-red-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  }

  const columns = [
    {
      key: "name",
      label: "Vendor Name",
      render: (row: Record<string, unknown>) => {
        const vendor = row as unknown as Vendor;
        return (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{vendor.name}</span>
          </div>
        );
      },
    },
    {
      key: "code",
      label: "Code",
      render: (row: Record<string, unknown>) => {
        const vendor = row as unknown as Vendor;
        return <span className="font-mono text-xs">{vendor.code}</span>;
      },
    },
    {
      key: "email",
      label: "Email",
      render: (row: Record<string, unknown>) => {
        const vendor = row as unknown as Vendor;
        return <span className="text-sm text-muted-foreground">{vendor.email}</span>;
      },
    },
    {
      key: "paymentTerms",
      label: "Payment Terms",
      render: (row: Record<string, unknown>) => {
        const vendor = row as unknown as Vendor;
        const days = Number(vendor.paymentTerms);
        const label = days === 0 ? "Due on Receipt" : `Net ${days}`;
        return <span className="text-sm">{label}</span>;
      },
    },
    {
      key: "riskScore",
      label: "Risk Score",
      render: (row: Record<string, unknown>) => {
        const vendor = row as unknown as Vendor;
        return (
          <span className={`font-mono text-sm font-semibold ${getRiskColor(vendor.riskScore)}`}>
            {vendor.riskScore}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row: Record<string, unknown>) => {
        const vendor = row as unknown as Vendor;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              vendor.status === "ACTIVE"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {vendor.status}
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
            <h1 className="text-2xl font-bold">Vendors</h1>
            <p className="text-sm text-muted-foreground">Manage vendor relationships</p>
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
            <Link href="/finance/ap">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Vendors</h1>
            <p className="text-sm text-muted-foreground">
              {data?.total || 0} vendors
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? "Cancel" : "Add Vendor"}
        </Button>
      </div>

      {/* Inline Add Vendor Form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold">Add New Vendor</h3>
          {error && (
            <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <form onSubmit={handleAddVendor} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="Vendor name"
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
                placeholder="V-001"
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
                placeholder="vendor@example.com"
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
            <div>
              <label className="mb-1 block text-sm font-medium">Risk Score</label>
              <select
                value={formRiskScore}
                onChange={(e) => setFormRiskScore(Number(e.target.value))}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end md:col-span-2 lg:col-span-5">
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Saving..." : "Save Vendor"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <DataTable
        columns={columns}
        data={(data?.data || []) as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No vendors found"
      />

      {data && (
        <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
