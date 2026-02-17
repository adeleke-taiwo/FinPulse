"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Department {
  id: string;
  name: string;
}

interface CostCenter {
  id: string;
  name: string;
  departmentId: string;
}

export default function NewExpensePage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [deptRes, ccRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/cost-centers"),
        ]);
        if (deptRes.ok) setDepartments(await deptRes.json());
        if (ccRes.ok) setCostCenters(await ccRes.json());
      } catch {
        setError("Failed to load form data");
      } finally {
        setLoading(false);
      }
    }
    loadDropdowns();
  }, []);

  async function handleSubmit(data: {
    title: string;
    amount: number;
    categorySlug: string;
    departmentId: string;
    costCenterId: string;
    receiptUrl: string;
    occurredAt: string;
  }) {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push("/expenses");
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.error || "Failed to create expense");
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
          <Link href="/expenses">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Expense</h1>
          <p className="text-sm text-muted-foreground">Submit a new expense report</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        <ExpenseForm
          departments={departments}
          costCenters={costCenters}
          onSubmit={handleSubmit}
        />
        {submitting && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Submitting expense...
          </div>
        )}
      </div>
    </div>
  );
}
