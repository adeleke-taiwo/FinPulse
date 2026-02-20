"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JournalLineEditor } from "@/components/finance/journal-line-editor";
import type { JournalLineInput } from "@/components/finance/journal-line-editor";
import { ArrowLeft, Save, Send } from "lucide-react";
import Link from "next/link";

interface GLAccountOption {
  id: string;
  code: string;
  name: string;
}

export default function NewJournalEntryPage() {
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    setDate(new Date().toISOString().split("T")[0]);
  }, []);
  const [lines, setLines] = useState<JournalLineInput[]>([
    { id: "line-1", glAccountId: "", description: "", debit: 0, credit: 0 },
    { id: "line-2", glAccountId: "", description: "", debit: 0, credit: 0 },
  ]);
  const [glAccounts, setGlAccounts] = useState<GLAccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch GL accounts for the dropdown
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const res = await fetch("/api/finance/gl");
        if (res.ok) {
          const json = await res.json();
          // Flatten the tree into a flat list of leaf accounts
          const flat: GLAccountOption[] = [];
          function walk(accounts: Array<{ id: string; code: string; name: string; children?: Array<{ id: string; code: string; name: string; children?: Array<{ id: string; code: string; name: string }> }> }>) {
            for (const acct of accounts) {
              if (acct.children && acct.children.length > 0) {
                walk(acct.children);
              } else {
                flat.push({ id: acct.id, code: acct.code, name: acct.name });
              }
            }
          }
          walk(json.data || []);
          setGlAccounts(flat);
        }
      } catch {
        setError("Failed to load GL accounts.");
      } finally {
        setLoading(false);
      }
    }
    fetchAccounts();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validate balanced
    const totalDebits = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredits = lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      setError("Journal entry must be balanced (debits must equal credits).");
      return;
    }

    // Validate at least 2 lines
    const validLines = lines.filter((l) => l.glAccountId && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      setError("At least 2 valid lines are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/finance/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          date,
          lines: validLines.map((l) => ({
            glAccountId: l.glAccountId,
            description: l.description,
            debit: l.debit,
            credit: l.credit,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/finance/journal/${data.id}`);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create journal entry.");
      }
    } catch {
      setError("Failed to create journal entry.");
    } finally {
      setSubmitting(false);
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
          <div>
            <h1 className="text-2xl font-bold">New Journal Entry</h1>
            <p className="text-sm text-muted-foreground">Create a new general ledger entry</p>
          </div>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold">New Journal Entry</h1>
            <p className="text-sm text-muted-foreground">Create a new general ledger entry</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header fields */}
        <Card>
          <CardHeader>
            <CardTitle>Entry Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Description *
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Monthly payroll accrual"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Journal lines */}
        <Card>
          <CardHeader>
            <CardTitle>Debit / Credit Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <JournalLineEditor
              lines={lines}
              onChange={setLines}
              glAccounts={glAccounts}
            />
          </CardContent>
        </Card>

        {/* Error message */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" size="sm" disabled={submitting}>
            <Save className="h-3 w-3" />
            {submitting ? "Saving..." : "Save as Draft"}
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/finance/journal">
              Cancel
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
