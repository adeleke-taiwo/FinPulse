"use client";

import { useState } from "react";
import { GripVertical, X, BarChart3, PieChart, LineChart, Table } from "lucide-react";

interface ReportBlock {
  id: string;
  type: "metric" | "chart" | "table";
  chartType?: "bar" | "line" | "pie";
  title: string;
  dataSource: string;
}

const DATA_SOURCES = [
  { id: "revenue", label: "Revenue", category: "Finance" },
  { id: "expenses", label: "Expenses", category: "Finance" },
  { id: "ap_aging", label: "AP Aging", category: "Finance" },
  { id: "ar_aging", label: "AR Aging", category: "Finance" },
  { id: "budget_variance", label: "Budget Variance", category: "Budgets" },
  { id: "department_spend", label: "Department Spending", category: "Departments" },
  { id: "expense_by_category", label: "Expenses by Category", category: "Expenses" },
  { id: "gl_balances", label: "GL Account Balances", category: "GL" },
  { id: "cash_flow", label: "Cash Flow", category: "Finance" },
  { id: "headcount", label: "Headcount", category: "HR" },
];

const BLOCK_TYPES = [
  { type: "metric" as const, label: "Metric Card", icon: <BarChart3 className="h-4 w-4" /> },
  { type: "chart" as const, label: "Chart", icon: <LineChart className="h-4 w-4" /> },
  { type: "table" as const, label: "Data Table", icon: <Table className="h-4 w-4" /> },
];

interface ReportBuilderProps {
  onSave?: (blocks: ReportBlock[], name: string) => void;
}

export function ReportBuilder({ onSave }: ReportBuilderProps) {
  const [blocks, setBlocks] = useState<ReportBlock[]>([]);
  const [reportName, setReportName] = useState("Untitled Report");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function addBlock(type: ReportBlock["type"]) {
    setBlocks([
      ...blocks,
      {
        id: crypto.randomUUID(),
        type,
        chartType: type === "chart" ? "bar" : undefined,
        title: `New ${type === "metric" ? "Metric" : type === "chart" ? "Chart" : "Table"}`,
        dataSource: DATA_SOURCES[0].id,
      },
    ]);
  }

  function removeBlock(id: string) {
    setBlocks(blocks.filter((b) => b.id !== id));
  }

  function updateBlock(id: string, updates: Partial<ReportBlock>) {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDrop(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const updated = [...blocks];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(targetIdx, 0, moved);
    setBlocks(updated);
    setDragIdx(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={reportName}
          onChange={(e) => setReportName(e.target.value)}
          className="border-0 bg-transparent text-lg font-bold focus:outline-none"
        />
        <button
          onClick={() => onSave?.(blocks, reportName)}
          disabled={blocks.length === 0}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Save Report
        </button>
      </div>

      {/* Block type palette */}
      <div className="flex gap-2 rounded-lg border border-dashed border-border p-3">
        <span className="text-sm text-muted-foreground self-center mr-2">Add:</span>
        {BLOCK_TYPES.map((bt) => (
          <button
            key={bt.type}
            onClick={() => addBlock(bt.type)}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            {bt.icon}
            {bt.label}
          </button>
        ))}
      </div>

      {/* Report blocks */}
      <div className="space-y-3">
        {blocks.length === 0 && (
          <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-border">
            <p className="text-sm text-muted-foreground">
              Click a block type above to start building your report
            </p>
          </div>
        )}
        {blocks.map((block, idx) => (
          <div
            key={block.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 cursor-grab text-muted-foreground active:cursor-grabbing">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={block.title}
                    onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                    className="flex-1 border-0 bg-transparent text-sm font-medium focus:outline-none"
                  />
                  <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize">{block.type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={block.dataSource}
                    onChange={(e) => updateBlock(block.id, { dataSource: e.target.value })}
                    className="rounded border border-border bg-background text-foreground px-2 py-1 text-sm focus:border-primary focus:outline-none"
                  >
                    {DATA_SOURCES.map((ds) => (
                      <option key={ds.id} value={ds.id} className="bg-background text-foreground">
                        [{ds.category}] {ds.label}
                      </option>
                    ))}
                  </select>
                  {block.type === "chart" && (
                    <div className="flex gap-1">
                      {(["bar", "line", "pie"] as const).map((ct) => (
                        <button
                          key={ct}
                          onClick={() => updateBlock(block.id, { chartType: ct })}
                          className={`rounded p-1.5 ${block.chartType === ct ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}
                        >
                          {ct === "bar" ? <BarChart3 className="h-3.5 w-3.5" /> : ct === "line" ? <LineChart className="h-3.5 w-3.5" /> : <PieChart className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Preview placeholder */}
                <div className="flex h-24 items-center justify-center rounded bg-muted/30 text-xs text-muted-foreground">
                  {block.type === "metric" && "[ Metric Value Preview ]"}
                  {block.type === "chart" && `[ ${block.chartType?.toUpperCase()} Chart Preview ]`}
                  {block.type === "table" && "[ Data Table Preview ]"}
                </div>
              </div>
              <button
                onClick={() => removeBlock(block.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
