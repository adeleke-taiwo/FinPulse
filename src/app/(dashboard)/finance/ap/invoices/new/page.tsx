"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InvoiceForm } from "@/components/finance/invoice-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ScanLine } from "lucide-react";
import Link from "next/link";

interface Vendor {
  id: string;
  name: string;
  code: string;
}

const DEMO_VENDORS = [
  "Acme Corp",
  "Global Supplies Inc.",
  "TechParts Ltd.",
  "Office Depot",
  "Cloud Services Co.",
];

const DEMO_DESCRIPTIONS = [
  "Server hosting - Q1 2026",
  "Office furniture delivery",
  "Software license renewal",
  "Consulting services - January",
  "Raw materials shipment",
  "IT equipment maintenance",
  "Marketing campaign services",
];

export default function NewAPInvoicePage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ocrData, setOcrData] = useState<{
    invoiceNumber: string;
    vendorId: string;
    dueDate: string;
    lines: { description: string; quantity: number; unitPrice: number }[];
    taxRate: number;
  } | null>(null);

  useEffect(() => {
    async function loadVendors() {
      try {
        const res = await fetch("/api/finance/vendors?limit=100");
        if (res.ok) {
          const json = await res.json();
          setVendors(json.data || json);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    loadVendors();
  }, []);

  function handleScanDemo() {
    const randomVendor = vendors.length > 0
      ? vendors[Math.floor(Math.random() * vendors.length)]
      : null;

    const lineCount = Math.floor(Math.random() * 3) + 1;
    const lines = Array.from({ length: lineCount }, () => ({
      description: DEMO_DESCRIPTIONS[Math.floor(Math.random() * DEMO_DESCRIPTIONS.length)],
      quantity: Math.floor(Math.random() * 10) + 1,
      unitPrice: parseFloat((Math.random() * 500 + 50).toFixed(2)),
    }));

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    setOcrData({
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      vendorId: randomVendor?.id || "",
      dueDate: dueDate.toISOString().slice(0, 10),
      lines,
      taxRate: [0, 5, 7.5, 10, 13][Math.floor(Math.random() * 5)],
    });
  }

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

      const res = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: data.invoiceNumber,
          vendorId: data.vendorOrCustomerId,
          dueDate: data.dueDate,
          lineItems: data.lineItems,
          taxRate: data.taxRate,
          amount: subtotal,
          taxAmount,
          totalAmount,
        }),
      });

      if (res.ok) {
        router.push("/finance/ap/invoices");
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finance/ap/invoices">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New AP Invoice</h1>
            <p className="text-sm text-muted-foreground">Capture a vendor invoice</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleScanDemo}>
          <ScanLine className="h-3.5 w-3.5" />
          Scan Invoice (Demo)
        </Button>
      </div>

      {ocrData && (
        <div className="rounded-md border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
          <span className="font-medium">OCR Simulation:</span> Invoice data auto-populated from scanned document.
          Fields have been filled with detected values. Review and adjust before saving.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        <InvoiceForm
          onSubmit={handleSubmit}
          entities={vendors.map((v) => ({ id: v.id, name: v.name, code: v.code }))}
          entityLabel="Vendor"
          type="ap"
        />
        {submitting && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Saving invoice...
          </div>
        )}
      </div>
    </div>
  );
}
