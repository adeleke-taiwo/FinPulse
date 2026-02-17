"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ApprovalTimeline } from "@/components/workflow/approval-timeline";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, toTitleCase } from "@/lib/utils";
import { format } from "date-fns";
import {
  ArrowLeft,
  AlertTriangle,
  Send,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface ExpenseDetail {
  id: string;
  title: string;
  amount: number;
  categorySlug: string;
  occurredAt: string;
  status: string;
  receiptUrl: string | null;
  submittedBy: { firstName: string; lastName: string; email: string };
  submittedAt: string;
  policyViolations: { rule: string; message: string; severity: string }[];
  workflow: {
    currentStep: number;
    steps: { stepOrder: number; name: string; approverRole: string }[];
    actions: {
      stepOrder: number;
      status: "PENDING" | "APPROVED" | "REJECTED" | "DELEGATED";
      comment?: string | null;
      actedAt?: string | null;
      actor?: { firstName: string; lastName: string; email: string } | null;
    }[];
  } | null;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  REIMBURSED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function ExpenseDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role || "USER";
  const isApprover = ["ADMIN", "MANAGER", "CFO"].includes(userRole);

  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadExpense() {
      try {
        const res = await fetch(`/api/expenses/${params.id}`);
        if (res.ok) setExpense(await res.json());
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    loadExpense();
  }, [params.id]);

  async function handleAction(action: "submit" | "approve" | "reject") {
    setActionLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/expenses/${params.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });

      if (res.ok) {
        const updated = await res.json();
        setExpense(updated);
        setComment("");
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.error || `Failed to ${action} expense`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-[300px] rounded-lg lg:col-span-2" />
          <Skeleton className="h-[300px] rounded-lg" />
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Expense not found
      </div>
    );
  }

  const canSubmit = expense.status === "DRAFT";
  const canApprove = isApprover && expense.status === "PENDING_APPROVAL";
  const canReject = isApprover && expense.status === "PENDING_APPROVAL";

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
          <h1 className="text-2xl font-bold">Expense Details</h1>
          <p className="text-sm text-muted-foreground">Review expense report</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Expense Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Expense Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">Title</dt>
                <dd className="text-sm font-medium text-foreground">{expense.title}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Amount</dt>
                <dd className="text-xl font-bold text-foreground">
                  {formatCurrency(expense.amount)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Category</dt>
                <dd className="text-sm capitalize text-foreground">
                  {toTitleCase(expense.categorySlug)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Date</dt>
                <dd className="text-sm text-foreground">
                  {format(new Date(expense.occurredAt), "MMMM d, yyyy")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusColors[expense.status] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {toTitleCase(expense.status)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Submitted By</dt>
                <dd className="text-sm text-foreground">
                  {expense.submittedBy?.firstName || ""} {expense.submittedBy?.lastName || ""}
                </dd>
              </div>
              {expense.receiptUrl && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Receipt</dt>
                  <dd>
                    <a
                      href={expense.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      View Receipt
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            {/* Policy Violations */}
            {Array.isArray(expense.policyViolations) && expense.policyViolations.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <h4 className="text-sm font-medium text-foreground">Policy Violations</h4>
                {expense.policyViolations.map((violation, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{violation.rule}:</span>{" "}
                      {violation.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(canSubmit || canApprove || canReject) && (
              <>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Comment</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                    className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  {canSubmit && (
                    <Button
                      onClick={() => handleAction("submit")}
                      disabled={actionLoading}
                      size="sm"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Submit for Approval
                    </Button>
                  )}
                  {canApprove && (
                    <Button
                      onClick={() => handleAction("approve")}
                      disabled={actionLoading}
                      size="sm"
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                  )}
                  {canReject && (
                    <Button
                      variant="destructive"
                      onClick={() => handleAction("reject")}
                      disabled={actionLoading}
                      size="sm"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  )}
                </div>
              </>
            )}

            {!canSubmit && !canApprove && !canReject && (
              <p className="text-sm text-muted-foreground">
                No actions available for this expense.
              </p>
            )}

            {actionLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Processing...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approval Timeline */}
      {expense.workflow && (
        <ApprovalTimeline
          steps={expense.workflow.steps}
          actions={expense.workflow.actions}
          currentStep={expense.workflow.currentStep}
          submittedBy={expense.submittedBy}
          submittedAt={expense.submittedAt}
        />
      )}
    </div>
  );
}
