"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Building2,
  Clock,
  Receipt,
  BarChart3,
  DollarSign,
  PlusCircle,
  X,
  Download,
  Loader2,
  Trash2,
} from "lucide-react";

const reportTemplates = [
  {
    id: "financial-summary",
    title: "Financial Summary",
    description: "Comprehensive overview of revenue, expenses, and net income for the selected period. Includes P&L and balance sheet highlights.",
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    endpoint: "/api/dashboard",
  },
  {
    id: "department-spending",
    title: "Department Spending",
    description: "Breakdown of expenditures by department with budget variance analysis and trend comparisons.",
    icon: Building2,
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    endpoint: "/api/dashboard",
  },
  {
    id: "ap-aging",
    title: "AP Aging",
    description: "Accounts payable aging report grouped by vendor. Shows current, 30, 60, 90+ day buckets with totals.",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    endpoint: "/api/finance/invoices",
  },
  {
    id: "ar-aging",
    title: "AR Aging",
    description: "Accounts receivable aging report grouped by customer. Track overdue invoices and collection priorities.",
    icon: Receipt,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
    endpoint: "/api/finance/invoices?status=OVERDUE",
  },
  {
    id: "budget-variance",
    title: "Budget Variance",
    description: "Compare budgeted vs actual spending across departments and GL accounts. Identify over and under-budget items.",
    icon: BarChart3,
    color: "text-indigo-600",
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    endpoint: "/api/finance/budgets",
  },
  {
    id: "expense-report",
    title: "Expense Report",
    description: "Detailed expense report by employee, category, and status. Includes policy compliance metrics.",
    icon: DollarSign,
    color: "text-rose-600",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    endpoint: "/api/expenses",
  },
];

interface ReportData {
  templateId: string;
  title: string;
  generatedAt: string;
  rows: Record<string, unknown>[];
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "-";
  if (typeof val === "number") {
    return val >= 1000
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(val)
      : val.toString();
  }
  if (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return String(val);
}

function downloadCsv(report: ReportData) {
  if (report.rows.length === 0) return;
  const headers = Object.keys(report.rows[0]);
  const csvRows = [
    headers.join(","),
    ...report.rows.map((row) =>
      headers.map((h) => {
        const val = row[h];
        const str = String(val ?? "");
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(",")
    ),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.title.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function flattenRow(row: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    if (val === null || val === undefined) {
      flat[key] = val;
    } else if (Array.isArray(val)) {
      // Skip arrays (nested line items, payments, etc.)
      continue;
    } else if (typeof val === "object" && val !== null) {
      // Inline simple nested objects like { vendor: { name, code } }
      for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
        if (typeof subVal !== "object" || subVal === null) {
          flat[`${key}_${subKey}`] = subVal;
        }
      }
    } else {
      flat[key] = val;
    }
  }
  return flat;
}

function extractRows(templateId: string, json: Record<string, unknown>): Record<string, unknown>[] {
  // Normalize different API response shapes into flat rows
  if (templateId === "financial-summary") {
    const kpis = json.kpis as Record<string, unknown> | undefined;
    const changes = (kpis?.changes || {}) as Record<string, number>;
    const revenue = (kpis?.revenue as number) ?? 0;
    const cashFlow = (kpis?.cashFlow as number) ?? 0;
    const expenses = revenue - cashFlow;

    return [
      { metric: "Total Revenue", amount: revenue, periodChange: `${(changes.revenue ?? 0).toFixed(1)}%` },
      { metric: "Total Expenses", amount: expenses, periodChange: "-" },
      { metric: "Net Cash Flow", amount: cashFlow, periodChange: `${(changes.cashFlow ?? 0).toFixed(1)}%` },
      { metric: "Active Users", amount: (kpis?.activeUsers as number) ?? 0, periodChange: `${(changes.activeUsers ?? 0).toFixed(1)}%` },
      { metric: "Growth Rate", amount: `${((kpis?.growthRate as number) ?? 0).toFixed(1)}%`, periodChange: "-" },
    ];
  }
  if (templateId === "department-spending") {
    const cats = (json.categoryBreakdown || []) as Record<string, unknown>[];
    return cats.map(({ color: _, ...rest }) => rest);
  }
  if (templateId === "budget-variance") {
    const data = json.data as Record<string, unknown>[] | undefined;
    if (!Array.isArray(data)) return [];
    return data.map((budget) => ({
      department: (budget.department as Record<string, unknown>)?.name || "-",
      fiscalYear: budget.fiscalYear,
      periodType: budget.periodType,
      status: budget.status,
      totalAmount: budget.totalAmount,
    }));
  }
  if (templateId === "expense-report") {
    const data = json.data as Record<string, unknown>[] | undefined;
    if (!Array.isArray(data)) return [];
    return data.map((exp) => ({
      title: exp.title,
      amount: exp.amount,
      category: exp.categorySlug || "-",
      status: exp.status,
      submittedAt: exp.createdAt,
    }));
  }
  if (templateId === "ap-aging" || templateId === "ar-aging") {
    const data = json.data as Record<string, unknown>[] | undefined;
    if (!Array.isArray(data)) return [];
    return data.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      vendor: (inv.vendor as Record<string, unknown>)?.name || "-",
      amount: inv.amount,
      totalAmount: inv.totalAmount,
      paidAmount: inv.paidAmount,
      status: inv.status,
      dueDate: inv.dueDate,
    }));
  }
  // Fallback
  const data = json.data;
  if (Array.isArray(data)) return data.map((r) => flattenRow(r as Record<string, unknown>));
  return [];
}

interface SavedReport {
  id: string;
  name: string;
  description: string | null;
  category: string;
  createdAt: string;
  createdBy: string;
}

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetch("/api/reports");
        if (res.ok) {
          const json = await res.json();
          setSavedReports(json.savedReports || []);
        }
      } catch {
        setError("Failed to load saved reports.");
      }
    }
    loadSaved();
  }, []);

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSavedReports((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      setError("Failed to delete report.");
    }
  }

  async function handleGenerate(templateId: string) {
    const template = reportTemplates.find((t) => t.id === templateId);
    if (!template) return;

    setGenerating(templateId);
    setError("");
    setReport(null);

    try {
      const res = await fetch(template.endpoint);
      if (!res.ok) {
        setError("Failed to fetch report data");
        return;
      }
      const json = await res.json();
      const rows = extractRows(templateId, json);

      setReport({
        templateId,
        title: template.title,
        generatedAt: new Date().toLocaleString(),
        rows,
      });
    } catch {
      setError("Network error generating report");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Generate and manage financial reports</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/reports/builder">
            <PlusCircle className="h-3.5 w-3.5" />
            Custom Report
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportTemplates.map((template) => (
          <Card key={template.id} className="flex flex-col">
            <div className="flex flex-1 flex-col">
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2.5 ${template.bg}`}>
                  <template.icon className={`h-5 w-5 ${template.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{template.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {template.description}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={generating === template.id}
                onClick={() => handleGenerate(template.id)}
              >
                {generating === template.id ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Report"
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Saved Custom Reports */}
      {savedReports.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">My Reports</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {savedReports.map((sr) => (
              <Card key={sr.id} className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium text-sm">{sr.name}</h3>
                  </div>
                  {sr.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{sr.description}</p>
                  )}
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    by {sr.createdBy} &middot; {new Date(sr.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(sr.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Report Preview */}
      {report && (
        <Card>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="font-semibold">{report.title}</h3>
              <p className="text-xs text-muted-foreground">
                Generated {report.generatedAt}
                {" - "}{report.rows.length} row{report.rows.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadCsv(report)}>
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setReport(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            {report.rows.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No data available for this report
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {Object.keys(report.rows[0]).filter((k) => !k.startsWith("_") && k !== "color").map((key) => (
                      <th key={key} className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                      {Object.entries(row).filter(([k]) => !k.startsWith("_") && k !== "color").map(([key, val]) => (
                        <td key={key} className="whitespace-nowrap px-3 py-2 tabular-nums">
                          {formatValue(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
