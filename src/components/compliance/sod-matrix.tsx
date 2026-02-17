"use client";

import { AlertTriangle, ShieldAlert, Shield } from "lucide-react";
import { toTitleCase } from "@/lib/utils";
import type { SoDConflict } from "@/lib/compliance/sod";

interface SoDMatrixProps {
  conflicts: Record<string, SoDConflict[]>;
  roles: string[];
}

export function SoDMatrix({ conflicts, roles }: SoDMatrixProps) {
  const totalConflicts = Object.values(conflicts).flat().length;
  const highSeverity = Object.values(conflicts)
    .flat()
    .filter((c) => c.severity === "high").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total Conflicts</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{totalConflicts}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">High Severity</p>
          <p className="mt-1 text-2xl font-bold text-destructive">{highSeverity}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Roles Affected</p>
          <p className="mt-1 text-2xl font-bold">{Object.keys(conflicts).length}</p>
        </div>
      </div>

      <div className="space-y-3">
        {roles.map((role) => {
          const roleConflicts = conflicts[role] || [];
          if (roleConflicts.length === 0) {
            return (
              <div key={role} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{toTitleCase(role)}</span>
                <span className="ml-auto text-xs text-green-600">No conflicts</span>
              </div>
            );
          }

          return (
            <div key={role} className="rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold">{toTitleCase(role)}</span>
                <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  {roleConflicts.length} conflict{roleConflicts.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y divide-border">
                {roleConflicts.map((conflict, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                    <AlertTriangle
                      className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${
                        conflict.severity === "high"
                          ? "text-destructive"
                          : conflict.severity === "medium"
                            ? "text-amber-500"
                            : "text-muted-foreground"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{conflict.conflictType}</p>
                      <p className="text-xs text-muted-foreground">{conflict.description}</p>
                      <div className="mt-1 flex gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {conflict.module1}.{conflict.action1}
                        </span>
                        <span className="text-xs text-muted-foreground">+</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {conflict.module2}.{conflict.action2}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        conflict.severity === "high"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          : conflict.severity === "medium"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {conflict.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
