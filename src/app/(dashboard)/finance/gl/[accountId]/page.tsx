"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";

interface GLAccountDetail {
  id: string;
  code: string;
  name: string;
  classification: string;
  normalBalance: string;
  description: string | null;
  isActive: boolean;
  balance: number;
}

interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  entryNumber: string;
  description: string;
  date: string;
  debit: number;
  credit: number;
  status: string;
}

const classColors: Record<string, string> = {
  ASSET: "text-blue-500",
  LIABILITY: "text-red-500",
  EQUITY: "text-purple-500",
  REVENUE: "text-green-500",
  EXPENSE: "text-orange-500",
};

type AccountNode = {
  id: string;
  code: string;
  name: string;
  classification: string;
  normalBalance?: string;
  description?: string;
  balance?: number;
  children?: AccountNode[];
};

function findAccount(accounts: AccountNode[], id: string): AccountNode | null {
  for (const a of accounts) {
    if (a.id === id) return a;
    if (a.children) {
      const found = findAccount(a.children, id);
      if (found) return found;
    }
  }
  return null;
}

export default function AccountLedgerPage() {
  const params = useParams();
  const accountId = params.accountId as string;

  const [account, setAccount] = useState<GLAccountDetail | null>(null);
  const [lines, setLines] = useState<JournalEntryLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Fetch account details and journal lines
        const res = await fetch(
          `/api/finance/gl?accountId=${accountId}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.account) {
            setAccount(json.account);
          }
          if (json.lines) {
            setLines(json.lines);
          }
          // If the API returns flat accounts, find the matching one
          if (json.data && Array.isArray(json.data)) {
            const found = findAccount(json.data, accountId);
            if (found) {
              setAccount({
                id: found.id,
                code: found.code,
                name: found.name,
                classification: found.classification,
                normalBalance: found.normalBalance || "DEBIT",
                description: found.description || null,
                isActive: true,
                balance: found.balance || 0,
              });
            }
          }
        }
      } catch {
        setError("Failed to load account details.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [accountId]);

  // Compute running balance
  function getRunningBalances(entries: JournalEntryLine[]) {
    let running = 0;
    return entries.map((line) => {
      running += line.debit - line.credit;
      return { ...line, runningBalance: running };
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finance/gl">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Account Ledger</h1>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finance/gl">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Account Ledger</h1>
        </div>
        <p className="text-muted-foreground">Account not found.</p>
      </div>
    );
  }

  const linesWithBalance = getRunningBalances(lines);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finance/gl">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Account Ledger</h1>
            <p className="text-sm text-muted-foreground">Detailed transaction history</p>
          </div>
        </div>
      </div>

      {/* Account info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Account Code</dt>
              <dd className="mt-0.5 font-mono text-lg font-bold text-foreground">
                {account.code}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Account Name</dt>
              <dd className="mt-0.5 text-lg font-medium text-foreground">
                {account.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Classification</dt>
              <dd className="mt-0.5">
                <Badge
                  variant="outline"
                  className={classColors[account.classification] || ""}
                >
                  {account.classification}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Balance</dt>
              <dd className="mt-0.5 font-mono text-lg font-bold tabular-nums">
                {formatCurrency(account.balance)}
              </dd>
            </div>
          </div>
          {account.description && (
            <p className="mt-3 text-sm text-muted-foreground">{account.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Journal lines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Journal Entry Lines
          </CardTitle>
        </CardHeader>
        <CardContent>
          {linesWithBalance.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No journal entry lines for this account.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">JE Number</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Debit</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Credit</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {linesWithBalance.map((line) => (
                    <tr
                      key={line.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-2 text-muted-foreground">
                        {format(new Date(line.date), "MMM d, yyyy")}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/finance/journal/${line.journalEntryId}`}
                          className="font-mono text-primary hover:underline"
                        >
                          {line.entryNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-foreground">{line.description}</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={
                            line.status === "POSTED"
                              ? "success"
                              : line.status === "DRAFT"
                              ? "outline"
                              : "warning"
                          }
                        >
                          {line.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {line.debit > 0 ? formatCurrency(line.debit) : "\u2014"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {line.credit > 0 ? formatCurrency(line.credit) : "\u2014"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums">
                        {formatCurrency(line.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
