"use client";

import { formatCurrency } from "@/lib/utils";

interface BudgetLineItem {
  id: string;
  accountCode: string;
  accountName: string;
  q1Amount: number;
  q2Amount: number;
  q3Amount: number;
  q4Amount: number;
  totalAmount: number;
  actualAmount: number;
}

interface BudgetTableProps {
  lineItems: BudgetLineItem[];
  onChange?: (items: BudgetLineItem[]) => void;
  readOnly?: boolean;
}

export function BudgetTable({ lineItems, onChange, readOnly }: BudgetTableProps) {
  function updateItem(id: string, field: keyof BudgetLineItem, value: number) {
    if (!onChange) return;
    onChange(
      lineItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        updated.totalAmount = updated.q1Amount + updated.q2Amount + updated.q3Amount + updated.q4Amount;
        return updated;
      })
    );
  }

  const totals = lineItems.reduce(
    (acc, item) => ({
      q1: acc.q1 + item.q1Amount,
      q2: acc.q2 + item.q2Amount,
      q3: acc.q3 + item.q3Amount,
      q4: acc.q4 + item.q4Amount,
      total: acc.total + item.totalAmount,
      actual: acc.actual + item.actualAmount,
    }),
    { q1: 0, q2: 0, q3: 0, q4: 0, total: 0, actual: 0 }
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Account</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Q1</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Q2</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Q3</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Q4</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total Budget</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Actual</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Variance</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item) => {
            const variance = item.totalAmount - item.actualAmount;
            const variancePct = item.totalAmount > 0 ? (variance / item.totalAmount) * 100 : 0;
            return (
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-3 py-1.5">
                  <span className="font-mono text-xs text-muted-foreground mr-2">{item.accountCode}</span>
                  {item.accountName}
                </td>
                {(["q1Amount", "q2Amount", "q3Amount", "q4Amount"] as const).map((field) => (
                  <td key={field} className="px-3 py-1.5">
                    {readOnly ? (
                      <span className="block text-right font-mono tabular-nums">{formatCurrency(item[field])}</span>
                    ) : (
                      <input
                        type="number"
                        value={item[field] || ""}
                        onChange={(e) => updateItem(item.id, field, parseFloat(e.target.value) || 0)}
                        min="0"
                        step="100"
                        className="w-24 rounded border border-border bg-transparent px-2 py-0.5 text-right text-sm tabular-nums focus:border-primary focus:outline-none"
                      />
                    )}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-right font-mono font-semibold tabular-nums">
                  {formatCurrency(item.totalAmount)}
                </td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                  {formatCurrency(item.actualAmount)}
                </td>
                <td className={`px-3 py-1.5 text-right font-mono tabular-nums ${variance < 0 ? "text-destructive" : "text-green-600"}`}>
                  {formatCurrency(variance)} ({variancePct.toFixed(1)}%)
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/30 font-semibold">
            <td className="px-3 py-2">Totals</td>
            <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(totals.q1)}</td>
            <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(totals.q2)}</td>
            <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(totals.q3)}</td>
            <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(totals.q4)}</td>
            <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(totals.total)}</td>
            <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(totals.actual)}</td>
            <td className={`px-3 py-2 text-right font-mono tabular-nums ${totals.total - totals.actual < 0 ? "text-destructive" : "text-green-600"}`}>
              {formatCurrency(totals.total - totals.actual)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
