"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, toTitleCase } from "@/lib/utils";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  occurredAt: string;
  category: string;
  accountNumber: string;
  hasRisk: boolean;
  riskSeverity?: string;
}

interface RecentTransactionsProps {
  data: Transaction[];
}

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive"> = {
  COMPLETED: "success",
  PENDING: "warning",
  FAILED: "destructive",
  REVERSED: "destructive",
};

export function RecentTransactions({ data }: RecentTransactionsProps) {
  const uniqueData = data.filter(
    (tx, i, arr) => arr.findIndex((t) => t.id === tx.id) === i
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <div className="space-y-3">
        {uniqueData.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between rounded-md border border-border px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  tx.type === "CREDIT"
                    ? "bg-success/10 text-success"
                    : tx.type === "DEBIT"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {tx.type === "CREDIT" ? "+" : tx.type === "DEBIT" ? "-" : "~"}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                  {tx.category}
                  {tx.hasRisk && (
                    <span className="ml-2 text-xs text-destructive">
                      ⚠ {tx.riskSeverity}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(tx.occurredAt), "MMM d, yyyy HH:mm")} •{" "}
                  ***{tx.accountNumber?.slice(-4)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusVariant[tx.status] || "default"}>
                {toTitleCase(tx.status)}
              </Badge>
              <span
                className={`text-sm font-semibold ${
                  tx.type === "CREDIT" ? "text-success" : "text-foreground"
                }`}
              >
                {tx.type === "CREDIT" ? "+" : "-"}
                {formatCurrency(tx.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
