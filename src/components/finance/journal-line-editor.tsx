"use client";

import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface JournalLineInput {
  id: string;
  glAccountId: string;
  glAccountName?: string;
  costCenterId?: string;
  description: string;
  debit: number;
  credit: number;
}

interface JournalLineEditorProps {
  lines: JournalLineInput[];
  onChange: (lines: JournalLineInput[]) => void;
  glAccounts: { id: string; code: string; name: string }[];
  costCenters?: { id: string; code: string; name: string }[];
}

export function JournalLineEditor({
  lines,
  onChange,
  glAccounts,
  costCenters,
}: JournalLineEditorProps) {
  function addLine() {
    onChange([
      ...lines,
      { id: crypto.randomUUID(), glAccountId: "", description: "", debit: 0, credit: 0 },
    ]);
  }

  function removeLine(id: string) {
    onChange(lines.filter((l) => l.id !== id));
  }

  function updateLine(id: string, field: keyof JournalLineInput, value: string | number) {
    onChange(
      lines.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  }

  const totalDebits = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredits = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Account</th>
              {costCenters && costCenters.length > 0 && (
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Cost Center</th>
              )}
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Debit</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Credit</th>
              <th className="w-10 px-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-border last:border-0">
                <td className="px-3 py-1.5">
                  <select
                    value={line.glAccountId}
                    onChange={(e) => updateLine(line.id, "glAccountId", e.target.value)}
                    className="w-full rounded border border-border bg-transparent px-2 py-1 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">Select account...</option>
                    {glAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </td>
                {costCenters && costCenters.length > 0 && (
                  <td className="px-3 py-1.5">
                    <select
                      value={line.costCenterId || ""}
                      onChange={(e) => updateLine(line.id, "costCenterId", e.target.value)}
                      className="w-full rounded border border-border bg-transparent px-2 py-1 text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="">None</option>
                      {costCenters.map((cc) => (
                        <option key={cc.id} value={cc.id}>
                          {cc.code} - {cc.name}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(line.id, "description", e.target.value)}
                    placeholder="Line description"
                    className="w-full rounded border border-border bg-transparent px-2 py-1 text-sm focus:border-primary focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    value={line.debit || ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onChange(
                        lines.map((l) =>
                          l.id === line.id
                            ? { ...l, debit: val, credit: val > 0 ? 0 : l.credit }
                            : l
                        )
                      );
                    }}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-28 rounded border border-border bg-transparent px-2 py-1 text-right text-sm tabular-nums focus:border-primary focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    value={line.credit || ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onChange(
                        lines.map((l) =>
                          l.id === line.id
                            ? { ...l, credit: val, debit: val > 0 ? 0 : l.debit }
                            : l
                        )
                      );
                    }}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-28 rounded border border-border bg-transparent px-2 py-1 text-right text-sm tabular-nums focus:border-primary focus:outline-none"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/30">
              <td colSpan={costCenters && costCenters.length > 0 ? 3 : 2} className="px-3 py-2 text-right font-semibold">
                Totals
              </td>
              <td className="px-3 py-2 text-right font-mono text-sm font-semibold tabular-nums">
                {formatCurrency(totalDebits)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-sm font-semibold tabular-nums">
                {formatCurrency(totalCredits)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addLine}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Line
        </button>

        <div className={`flex items-center gap-1.5 text-sm font-medium ${isBalanced ? "text-green-600" : "text-destructive"}`}>
          {isBalanced ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Balanced
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              Difference: {formatCurrency(Math.abs(totalDebits - totalCredits))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
