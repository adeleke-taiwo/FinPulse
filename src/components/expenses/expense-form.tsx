"use client";

import { useState } from "react";
import { Upload, AlertTriangle } from "lucide-react";

interface ExpenseFormProps {
  departments: { id: string; name: string }[];
  costCenters: { id: string; name: string; departmentId: string }[];
  onSubmit: (data: {
    title: string;
    amount: number;
    categorySlug: string;
    departmentId: string;
    costCenterId: string;
    receiptUrl: string;
    occurredAt: string;
  }) => void;
}

const EXPENSE_CATEGORIES = [
  { slug: "meals", label: "Meals & Entertainment" },
  { slug: "travel", label: "Travel" },
  { slug: "accommodation", label: "Accommodation" },
  { slug: "transportation", label: "Transportation" },
  { slug: "office_supplies", label: "Office Supplies" },
  { slug: "software", label: "Software & Subscriptions" },
  { slug: "training", label: "Training & Education" },
  { slug: "communication", label: "Communication" },
  { slug: "other", label: "Other" },
];

export function ExpenseForm({ departments, costCenters, onSubmit }: ExpenseFormProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10));

  const filteredCostCenters = costCenters.filter((cc) => cc.departmentId === departmentId);
  const amountNum = parseFloat(amount) || 0;
  const needsReceipt = amountNum > 25 && !receiptUrl;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      title,
      amount: amountNum,
      categorySlug,
      departmentId,
      costCenterId,
      receiptUrl,
      occurredAt,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Expense Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={5}
          placeholder="e.g., Client dinner at Restaurant XYZ"
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Amount ($)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="0.01"
            step="0.01"
            placeholder="0.00"
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Category</label>
          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Select category...</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat.slug} value={cat.slug}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Department</label>
          <select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setCostCenterId("");
            }}
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Select department...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Cost Center</label>
          <select
            value={costCenterId}
            onChange={(e) => setCostCenterId(e.target.value)}
            disabled={!departmentId}
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
          >
            <option value="">Select cost center...</option>
            {filteredCostCenters.map((cc) => (
              <option key={cc.id} value={cc.id}>{cc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Date</label>
          <input
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Receipt URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
              title="Upload receipt (simulated)"
              onClick={() => setReceiptUrl("/receipts/receipt-" + Date.now() + ".pdf")}
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {needsReceipt && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Receipt required for expenses over $25
        </div>
      )}

      {amountNum > 10000 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Expenses over $10,000 require CFO approval
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Save Expense
        </button>
      </div>
    </form>
  );
}
