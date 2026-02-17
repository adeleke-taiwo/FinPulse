"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface TransactionDetail {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  occurredAt: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  category: { name: string; color: string; icon: string } | null;
  fromAccount: {
    accountNumber: string;
    type: string;
    user: { firstName: string; lastName: string };
  } | null;
  toAccount: { accountNumber: string; type: string } | null;
  riskFlags: {
    id: string;
    severity: string;
    status: string;
    riskScore: number;
    ruleTriggered: string;
    details: Record<string, unknown> | null;
    createdAt: string;
  }[];
}

const severityColor: Record<string, string> = {
  LOW: "bg-warning/20 text-warning border-warning/30",
  MEDIUM: "bg-warning/30 text-warning border-warning/50",
  HIGH: "bg-destructive/20 text-destructive border-destructive/30",
  CRITICAL: "bg-destructive/30 text-destructive border-destructive/50",
};

export default function TransactionDetailPage() {
  const params = useParams();
  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/transactions/${params.id}`);
      if (res.ok) setTx(await res.json());
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Transaction not found
      </div>
    );
  }

  const riskScore =
    tx.riskFlags.length > 0
      ? Math.max(...tx.riskFlags.map((r) => r.riskScore))
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/transactions">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          Transaction Details
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">Amount</dt>
                <dd className="text-xl font-bold text-foreground">
                  {formatCurrency(tx.amount)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Type</dt>
                <dd>
                  <Badge
                    variant={
                      tx.type === "CREDIT" ? "success" : tx.type === "DEBIT" ? "destructive" : "default"
                    }
                  >
                    {tx.type}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd>
                  <Badge
                    variant={
                      tx.status === "COMPLETED" ? "success" : tx.status === "PENDING" ? "warning" : "destructive"
                    }
                  >
                    {tx.status}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Category</dt>
                <dd className="text-sm text-foreground">
                  {tx.category?.name || "Uncategorized"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Date</dt>
                <dd className="text-sm text-foreground">
                  {format(new Date(tx.occurredAt), "MMMM d, yyyy HH:mm:ss")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Description</dt>
                <dd className="text-sm text-foreground">
                  {tx.description || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">From Account</dt>
                <dd className="text-sm text-foreground">
                  {tx.fromAccount
                    ? `***${tx.fromAccount.accountNumber.slice(-4)} (${tx.fromAccount.type})`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">To Account</dt>
                <dd className="text-sm text-foreground">
                  {tx.toAccount
                    ? `***${tx.toAccount.accountNumber.slice(-4)} (${tx.toAccount.type})`
                    : "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Risk Score Indicator */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div
              className={`flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold ${
                riskScore > 75
                  ? "bg-destructive/20 text-destructive"
                  : riskScore > 50
                  ? "bg-warning/20 text-warning"
                  : "bg-success/20 text-success"
              }`}
            >
              {riskScore > 0 ? riskScore.toFixed(0) : "OK"}
            </div>
            <p className="text-sm text-muted-foreground">
              {riskScore > 75
                ? "High Risk"
                : riskScore > 50
                ? "Medium Risk"
                : riskScore > 0
                ? "Low Risk"
                : "No Risk Flags"}
            </p>

            {tx.riskFlags.length > 0 && (
              <div className="w-full space-y-2 border-t border-border pt-4">
                {tx.riskFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className={`rounded-md border p-3 ${severityColor[flag.severity]}`}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-xs font-medium">
                        {flag.ruleTriggered}
                      </span>
                    </div>
                    <p className="mt-1 text-xs opacity-80">
                      Score: {flag.riskScore} | Status: {flag.status}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
