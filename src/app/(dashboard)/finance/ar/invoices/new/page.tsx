"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InvoiceForm } from "@/components/finance/invoice-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  code: string;
}

export default function NewARInvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch("/api/finance/customers?limit=100");
        if (res.ok) {
          const json = await res.json();
          setCustomers(json.data || json);
        }
      } catch {
        setError("Failed to load customers.");
      } finally {
        setLoading(false);
      }
    }
    loadCustomers();
  }, []);

  async function handleSubmit(data: {
    invoiceNumber: string;
    vendorOrCustomerId: string;
    dueDate: string;
    lineItems: { id: string; description: string; quantity: number; unitPrice: number; amount: number }[];
    taxRate: number;
  }) {
    setSubmitting(true);
    setError("");

    try {
      const subtotal = data.lineItems.reduce((sum, li) => sum + li.amount, 0);
      const taxAmount = subtotal * (data.taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      const res = await fetch("/api/finance/customer-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: data.invoiceNumber,
          customerId: data.vendorOrCustomerId,
          dueDate: data.dueDate,
          totalAmount,
          lineItems: data.lineItems,
          taxRate: data.taxRate,
        }),
      });

      if (res.ok) {
        router.push("/finance/ar/invoices");
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.error || "Failed to create invoice");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/finance/ar/invoices">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Customer Invoice</h1>
          <p className="text-sm text-muted-foreground">Create an invoice for a customer</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        <InvoiceForm
          onSubmit={handleSubmit}
          entities={customers.map((c) => ({ id: c.id, name: c.name, code: c.code }))}
          entityLabel="Customer"
          type="ar"
        />
        {submitting && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Creating invoice...
          </div>
        )}
      </div>
    </div>
  );
}
