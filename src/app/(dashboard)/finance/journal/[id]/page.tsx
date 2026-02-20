"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, toTitleCase } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, XCircle, Send } from "lucide-react";
import Link from "next/link";

interface JournalLine {
  id: string;
  description: string;
  debit: number;
  credit: number;
  glAccount: { code: string; name: string };
}

interface JournalEntryDetail {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  status: string;
  createdAt: string;
  lines: JournalLine[];
  createdBy: { firstName: string; lastName: string } | null;
  approvedBy: { firstName: string; lastName: string } | null;
}

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "outline"> = {
  DRAFT: "outline",
  PENDING_APPROVAL: "warning",
  APPROVED: "default",
  POSTED: "success",
  REVERSED: "destructive",
};

const statusColors: Record<string, string> = {
  DRAFT: "border-border bg-muted/30",
  PENDING_APPROVAL: "border-warning/30 bg-warning/5",
  APPROVED: "border-primary/30 bg-primary/5",
  POSTED: "border-green-500/30 bg-green-500/5",
  REVERSED: "border-destructive/30 bg-destructive/5",
};

export default function JournalEntryDetailPage() {
  const params = useParams();
  const entryId = params.id as string;

  const [entry, setEntry] = useState<JournalEntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/finance/journal/${entryId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setEntry(json.data);
          }
        }
      } catch {
        setError("Failed to load journal entry.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [entryId]);

  async function handleAction(action: "approve" | "post" | "reject") {
    if (!entry) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/finance/journal/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setEntry(json.data);
        }
      }
    } catch {
      setError("Failed to perform action.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finance/journal">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Journal Entry Detail</h1>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finance/journal">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Journal Entry Detail</h1>
        </div>
        <p className="text-muted-foreground">Journal entry not found.</p>
      </div>
    );
  }

  const totalDebits = entry.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredits = entry.lines.reduce((s, l) => s + l.credit, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finance/journal">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Journal Entry Detail</h1>
            <p className="text-sm text-muted-foreground">
              Entry #{entry.entryNumber}
            </p>
          </div>
        </div>

        {/* Action buttons based on status */}
        <div className="flex items-center gap-2">
          {(entry.status === "DRAFT" || entry.status === "PENDING_APPROVAL") && (
            <Button
              size="sm"
              onClick={() => handleAction("approve")}
              disabled={actionLoading}
            >
              <CheckCircle2 className="h-3 w-3" />
              Approve
            </Button>
          )}
          {entry.status === "APPROVED" && (
            <Button
              size="sm"
              onClick={() => handleAction("post")}
              disabled={actionLoading}
            >
              <Send className="h-3 w-3" />
              Post
            </Button>
          )}
          {entry.status === "PENDING_APPROVAL" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleAction("reject")}
              disabled={actionLoading}
            >
              <XCircle className="h-3 w-3" />
              Reject
            </Button>
          )}
        </div>
      </div>

      {/* Entry header info */}
      <div className={`rounded-lg border p-6 ${statusColors[entry.status] || "border-border bg-card"}`}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <dt className="text-xs text-muted-foreground">Entry Number</dt>
            <dd className="mt-0.5 font-mono text-sm font-bold">{entry.entryNumber}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Date</dt>
            <dd className="mt-0.5 text-sm font-medium">
              {format(new Date(entry.date), "MMM d, yyyy")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="mt-0.5">
              <Badge variant={statusVariant[entry.status] || "outline"}>
                {toTitleCase(entry.status)}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Description</dt>
            <dd className="mt-0.5 text-sm">{entry.description}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Created By</dt>
            <dd className="mt-0.5 text-sm">
              {entry.createdBy
                ? `${entry.createdBy.firstName} ${entry.createdBy.lastName}`
                : "\u2014"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Approved By</dt>
            <dd className="mt-0.5 text-sm">
              {entry.approvedBy
                ? `${entry.approvedBy.firstName} ${entry.approvedBy.lastName}`
                : "\u2014"}
            </dd>
          </div>
        </div>
      </div>

      {/* Lines table */}
      <Card>
        <CardHeader>
          <CardTitle>Journal Lines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Account</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Debit</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Credit</th>
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((line) => (
                  <tr
                    key={line.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {line.glAccount.code}
                      </span>{" "}
                      <span className="text-foreground">{line.glAccount.name}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {line.description || "\u2014"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {line.debit > 0 ? formatCurrency(line.debit) : ""}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {line.credit > 0 ? formatCurrency(line.credit) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td colSpan={2} className="px-3 py-2 text-right font-semibold">
                    Totals
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums">
                    {formatCurrency(totalDebits)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums">
                    {formatCurrency(totalCredits)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Balance indicator */}
          <div className="mt-3 flex justify-end">
            {Math.abs(totalDebits - totalCredits) < 0.01 ? (
              <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Balanced
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm font-medium text-destructive">
                <XCircle className="h-4 w-4" />
                Difference: {formatCurrency(Math.abs(totalDebits - totalCredits))}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
