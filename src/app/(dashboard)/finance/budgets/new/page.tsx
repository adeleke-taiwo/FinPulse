"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

interface LineItem {
  id: string;
  glAccountId: string;
  accountCode: string;
  accountName: string;
  q1Amount: number;
  q2Amount: number;
  q3Amount: number;
  q4Amount: number;
}

interface Department {
  id: string;
  name: string;
}

interface GLAccount {
  id: string;
  code: string;
  name: string;
  children?: GLAccount[];
}

const FISCAL_YEARS = [2025, 2026, 2027];
const PERIOD_TYPES = ["ANNUAL", "QUARTERLY", "MONTHLY"];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function flattenAccounts(accounts: GLAccount[]): { id: string; code: string; name: string }[] {
  const result: { id: string; code: string; name: string }[] = [];
  for (const acct of accounts) {
    result.push({ id: acct.id, code: acct.code, name: acct.name });
    if (acct.children) {
      result.push(...flattenAccounts(acct.children));
    }
  }
  return result;
}

export default function NewBudgetPage() {
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [glAccounts, setGlAccounts] = useState<{ id: string; code: string; name: string }[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [fiscalYear, setFiscalYear] = useState(2026);
  const [periodType, setPeriodType] = useState("ANNUAL");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [deptRes, glRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/finance/gl"),
        ]);
        if (deptRes.ok) {
          const deptJson = await deptRes.json();
          const depts = deptJson.data || deptJson;
          setDepartments(depts);
          if (depts.length > 0) setDepartmentId(depts[0].id);
        }
        if (glRes.ok) {
          const glJson = await glRes.json();
          const tree = glJson.data || glJson;
          setGlAccounts(flattenAccounts(tree));
        }
      } catch {
        setError("Failed to load form data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  function addLineItem() {
    const usedIds = lineItems.map((li) => li.glAccountId);
    const available = glAccounts.find((a) => !usedIds.includes(a.id));
    if (!available) return;

    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        glAccountId: available.id,
        accountCode: available.code,
        accountName: available.name,
        q1Amount: 0,
        q2Amount: 0,
        q3Amount: 0,
        q4Amount: 0,
      },
    ]);
  }

  function removeLineItem(id: string) {
    setLineItems(lineItems.filter((li) => li.id !== id));
  }

  function updateLineItem(id: string, field: keyof LineItem, value: string | number) {
    setLineItems(
      lineItems.map((li) => {
        if (li.id !== id) return li;
        if (field === "glAccountId") {
          const account = glAccounts.find((a) => a.id === value);
          return {
            ...li,
            glAccountId: value as string,
            accountCode: account?.code || "",
            accountName: account?.name || "",
          };
        }
        return { ...li, [field]: typeof value === "string" ? parseFloat(value) || 0 : value };
      })
    );
  }

  const totalBudget = lineItems.reduce(
    (sum, li) => sum + li.q1Amount + li.q2Amount + li.q3Amount + li.q4Amount,
    0
  );

  async function handleSubmit() {
    if (lineItems.length === 0) {
      setError("Add at least one line item");
      return;
    }
    if (!departmentId) {
      setError("Please select a department");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        departmentId,
        fiscalYear,
        periodType,
        totalAmount: totalBudget,
        lineItems: lineItems.map((li) => ({
          glAccountId: li.glAccountId,
          q1Amount: li.q1Amount,
          q2Amount: li.q2Amount,
          q3Amount: li.q3Amount,
          q4Amount: li.q4Amount,
          totalAmount: li.q1Amount + li.q2Amount + li.q3Amount + li.q4Amount,
        })),
      };

      const res = await fetch("/api/finance/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/finance/budgets");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create budget");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finance/budgets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Budget</h1>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finance/budgets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Budget</h1>
            <p className="text-sm text-muted-foreground">Create a new departmental budget</p>
          </div>
        </div>
        <Button size="sm" onClick={handleSubmit} disabled={saving}>
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save Budget"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Budget Details */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Select department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Fiscal Year
              </label>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(parseInt(e.target.value))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {FISCAL_YEARS.map((y) => (
                  <option key={y} value={y}>
                    FY {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Period Type
              </label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {PERIOD_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Line Items</CardTitle>
            <Button variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="h-3.5 w-3.5" />
              Add Line Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lineItems.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                No line items added. Click &quot;Add Line Item&quot; to begin.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">GL Account</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Q1</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Q2</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Q3</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Q4</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => {
                    const lineTotal = item.q1Amount + item.q2Amount + item.q3Amount + item.q4Amount;
                    return (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-1.5">
                          <select
                            value={item.glAccountId}
                            onChange={(e) => updateLineItem(item.id, "glAccountId", e.target.value)}
                            className="w-full rounded border border-border bg-transparent px-2 py-1 text-sm focus:border-primary focus:outline-none"
                          >
                            {glAccounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} - {a.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        {(["q1Amount", "q2Amount", "q3Amount", "q4Amount"] as const).map((field) => (
                          <td key={field} className="px-3 py-1.5">
                            <input
                              type="number"
                              value={item[field] || ""}
                              onChange={(e) => updateLineItem(item.id, field, e.target.value)}
                              min="0"
                              step="100"
                              placeholder="0"
                              className="w-24 rounded border border-border bg-transparent px-2 py-0.5 text-right text-sm tabular-nums focus:border-primary focus:outline-none"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-1.5 text-right font-mono font-semibold tabular-nums">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <button
                            onClick={() => removeLineItem(item.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                    <td className="px-3 py-2" colSpan={5}>
                      Total Budget
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {formatCurrency(totalBudget)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
