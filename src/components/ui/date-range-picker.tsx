"use client";

import { useState } from "react";

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const PRESETS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
];

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [startDate, setStartDate] = useState(from);
  const [endDate, setEndDate] = useState(to);

  function applyPreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const f = start.toISOString().split("T")[0];
    const t = end.toISOString().split("T")[0];
    setStartDate(f);
    setEndDate(t);
    onChange(f, t);
  }

  function handleApply() {
    onChange(startDate, endDate);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p.days)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
        />
        <button
          onClick={handleApply}
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
