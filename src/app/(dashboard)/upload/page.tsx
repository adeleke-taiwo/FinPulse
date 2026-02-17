"use client";

import { useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface UploadResult {
  uploadId: string;
  success: boolean;
  rowsProcessed: number;
  rowsFailed: number;
  errors: { row: number; field: string; message: string }[];
}

const TARGET_COLUMNS = ["date", "amount", "type", "description", "category"];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);

    // Read headers
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const firstLine = text.split("\n")[0];
      const cols = firstLine.split(",").map((h) => h.trim().replace(/"/g, ""));
      setHeaders(cols);

      // Auto-map matching columns
      const autoMap: Record<string, string> = {};
      for (const target of TARGET_COLUMNS) {
        const match = cols.find(
          (c) => c.toLowerCase() === target || c.toLowerCase().includes(target)
        );
        if (match) autoMap[target] = match;
      }
      setMapping(autoMap);
    };
    reader.readAsText(f);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".csv")) handleFile(f);
  }

  async function handleUpload() {
    if (!file || !mapping.date || !mapping.amount || !mapping.type) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(mapping));

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        setResult(await res.json());
      } else {
        const err = await res.json();
        setResult({
          uploadId: "",
          success: false,
          rowsProcessed: 0,
          rowsFailed: 0,
          errors: [{ row: 0, field: "file", message: err.error }],
        });
      }
    } catch {
      setResult({
        uploadId: "",
        success: false,
        rowsProcessed: 0,
        rowsFailed: 0,
        errors: [{ row: 0, field: "file", message: "Upload failed" }],
      });
    }
    setUploading(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">CSV Upload</h1>

      {/* Drop Zone */}
      <Card>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="mb-2 text-sm font-medium text-foreground">
            Drag & drop your CSV file here
          </p>
          <p className="mb-4 text-xs text-muted-foreground">or click to browse</p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button variant="outline" size="sm" className="cursor-pointer" type="button" onClick={() => document.getElementById("file-upload")?.click()}>
              Choose File
            </Button>
          </label>
          {file && (
            <div className="mt-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">{file.name}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Column Mapping */}
      {headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Column Mapping</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TARGET_COLUMNS.map((target) => (
                <div key={target}>
                  <label className="mb-1 block text-xs font-medium capitalize text-foreground">
                    {target} {["date", "amount", "type"].includes(target) && (
                      <span className="text-destructive">*</span>
                    )}
                  </label>
                  <select
                    value={mapping[target] || ""}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [target]: e.target.value }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">-- Select column --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button
                onClick={handleUpload}
                disabled={uploading || !mapping.date || !mapping.amount || !mapping.type}
              >
                {uploading ? "Processing..." : "Upload & Process"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.rowsFailed === 0 ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : result.rowsProcessed === 0 ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-warning" />
              )}
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Badge variant="success">{result.rowsProcessed} valid rows</Badge>
              {result.rowsFailed > 0 && (
                <Badge variant="destructive">{result.rowsFailed} invalid rows</Badge>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{
                  width: `${
                    (result.rowsProcessed / (result.rowsProcessed + result.rowsFailed || 1)) * 100
                  }%`,
                }}
              />
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4 max-h-60 overflow-y-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2 text-left">Row</th>
                      <th className="px-3 py-2 text-left">Field</th>
                      <th className="px-3 py-2 text-left">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.slice(0, 50).map((err, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="px-3 py-1.5">{err.row}</td>
                        <td className="px-3 py-1.5">{err.field}</td>
                        <td className="px-3 py-1.5 text-destructive">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
