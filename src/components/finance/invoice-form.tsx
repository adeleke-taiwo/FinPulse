"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceFormProps {
  onSubmit: (data: {
    invoiceNumber: string;
    vendorOrCustomerId: string;
    dueDate: string;
    lineItems: LineItem[];
    taxRate: number;
  }) => void;
  entities: { id: string; name: string; code: string }[];
  entityLabel: string;
  type: "ap" | "ar";
}

export function InvoiceForm({ onSubmit, entities, entityLabel, type }: InvoiceFormProps) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [entityId, setEntityId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [lines, setLines] = useState<LineItem[]>([
    { id: "line-1", description: "", quantity: 1, unitPrice: 0, amount: 0 },
  ]);

  function addLine() {
    setLines([
      ...lines,
      { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, amount: 0 },
    ]);
  }

  function removeLine(id: string) {
    if (lines.length <= 1) return;
    setLines(lines.filter((l) => l.id !== id));
  }

  function updateLine(id: string, field: keyof LineItem, value: string | number) {
    setLines(
      lines.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        updated.amount = updated.quantity * updated.unitPrice;
        return updated;
      })
    );
  }

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ invoiceNumber, vendorOrCustomerId: entityId, dueDate, lineItems: lines, taxRate });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Invoice Number</label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
            placeholder={type === "ap" ? "INV-001" : "CI-001"}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{entityLabel}</label>
          <select
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Select {entityLabel.toLowerCase()}...</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.code} - {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Unit Price</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-border last:border-0">
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(line.id, "description", e.target.value)}
                    placeholder="Item description"
                    className="w-full rounded border border-border bg-transparent px-2 py-1 text-sm focus:border-primary focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    value={line.quantity}
                    onChange={(e) => updateLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                    min="1"
                    className="w-20 rounded border border-border bg-transparent px-2 py-1 text-right text-sm focus:border-primary focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    value={line.unitPrice || ""}
                    onChange={(e) => updateLine(line.id, "unitPrice", parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-28 rounded border border-border bg-transparent px-2 py-1 text-right text-sm focus:border-primary focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-sm tabular-nums">
                  ${line.amount.toFixed(2)}
                </td>
                <td className="px-2">
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start justify-between">
        <button
          type="button"
          onClick={addLine}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Line
        </button>

        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono tabular-nums">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Tax (%)</span>
            <input
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              min="0"
              max="100"
              step="0.5"
              className="w-16 rounded border border-border bg-transparent px-2 py-0.5 text-right text-sm focus:border-primary focus:outline-none"
            />
            <span className="font-mono tabular-nums">${taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 font-semibold">
            <span>Total</span>
            <span className="font-mono tabular-nums">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {type === "ap" ? "Save Invoice" : "Create Invoice"}
        </button>
      </div>
    </form>
  );
}
