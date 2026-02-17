"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReportBuilder } from "@/components/reports/report-builder";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

export default function ReportBuilderPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState("");
  const [error, setError] = useState("");

  async function handleSave(blocks: unknown[], name: string) {
    setSaving(true);
    setError("");
    setSavedId("");

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: `Custom report: ${name}`,
          category: "custom",
          filters: { blocks },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const id = json.data?.id || "saved";
        setSavedId(id);
        setTimeout(() => router.push("/reports"), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save report");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Report Builder</h1>
            <p className="text-sm text-muted-foreground">
              Drag and drop blocks to create a custom report
            </p>
          </div>
        </div>
        {saving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </div>
        )}
      </div>

      {savedId && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          Report saved (ID: {savedId}). Redirecting to reports...
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <ReportBuilder onSave={handleSave} />
    </div>
  );
}
