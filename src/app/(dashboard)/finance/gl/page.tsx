"use client";

import { useState, useEffect, useCallback } from "react";
import { AccountTree } from "@/components/finance/account-tree";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";

interface GLAccount {
  id: string;
  code: string;
  name: string;
  classification: string;
  normalBalance: string;
  balance?: number;
  children?: GLAccount[];
}

interface ClassificationTotal {
  classification: string;
  total: number;
  count: number;
}

const classColors: Record<string, string> = {
  ASSET: "text-blue-500",
  LIABILITY: "text-red-500",
  EQUITY: "text-purple-500",
  REVENUE: "text-green-500",
  EXPENSE: "text-orange-500",
};

const classBgColors: Record<string, string> = {
  ASSET: "bg-blue-500/10 border-blue-500/20",
  LIABILITY: "bg-red-500/10 border-red-500/20",
  EQUITY: "bg-purple-500/10 border-purple-500/20",
  REVENUE: "bg-green-500/10 border-green-500/20",
  EXPENSE: "bg-orange-500/10 border-orange-500/20",
};

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/gl");
      if (res.ok) {
        const json = await res.json();
        setAccounts(json.data);
      }
    } catch {
      setError("Failed to load chart of accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Calculate totals by classification
  function calculateTotals(accts: GLAccount[]): ClassificationTotal[] {
    const totals: Record<string, { total: number; count: number }> = {};

    function walk(account: GLAccount) {
      const cls = account.classification;
      if (!totals[cls]) {
        totals[cls] = { total: 0, count: 0 };
      }
      if (account.balance !== undefined) {
        totals[cls].total += account.balance;
      }
      totals[cls].count++;
      if (account.children) {
        account.children.forEach(walk);
      }
    }

    accts.forEach(walk);

    return Object.entries(totals).map(([classification, data]) => ({
      classification,
      ...data,
    }));
  }

  // Build tree structure grouped by classification
  function buildTree(accts: GLAccount[]): GLAccount[] {
    const groups: Record<string, GLAccount[]> = {};

    for (const acct of accts) {
      const cls = acct.classification;
      if (!groups[cls]) {
        groups[cls] = [];
      }
      groups[cls].push(acct);
    }

    const order = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
    const tree: GLAccount[] = [];

    for (const cls of order) {
      if (groups[cls]) {
        tree.push({
          id: `group-${cls}`,
          code: "",
          name: cls,
          classification: cls,
          normalBalance: cls === "ASSET" || cls === "EXPENSE" ? "DEBIT" : "CREDIT",
          children: groups[cls],
        });
      }
    }

    return tree;
  }

  function handleSelect(accountId: string) {
    if (accountId.startsWith("group-")) return;
    setSelectedId(accountId);
    router.push(`/finance/gl/${accountId}`);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Chart of Accounts</h1>
            <p className="text-sm text-muted-foreground">General ledger account structure</p>
          </div>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const totals = calculateTotals(accounts);
  const tree = buildTree(accounts);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">General ledger account structure</p>
        </div>
      </div>

      {/* Classification totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {totals.map((t) => (
          <div
            key={t.classification}
            className={`rounded-lg border p-4 ${classBgColors[t.classification] || "bg-card border-border"}`}
          >
            <p className={`text-xs font-semibold uppercase tracking-wide ${classColors[t.classification] || ""}`}>
              {t.classification}
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {formatCurrency(t.total)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.count} accounts
            </p>
          </div>
        ))}
      </div>

      {/* Account tree */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <BookOpen className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No GL accounts found. Set up your chart of accounts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <AccountTree
          accounts={tree}
          onSelect={handleSelect}
          selectedId={selectedId}
        />
      )}
    </div>
  );
}
