"use client";

import { useState } from "react";
import { MODULES, ACTIONS, type Module, type Action, type PermissionMap } from "@/types/permissions";

interface PermissionMatrixProps {
  permissions: PermissionMap;
  onChange: (permissions: PermissionMap) => void;
  readOnly?: boolean;
}

export function PermissionMatrix({ permissions, onChange, readOnly }: PermissionMatrixProps) {
  const [expanded, setExpanded] = useState(true);

  function togglePermission(module: Module, action: Action) {
    if (readOnly) return;
    const current = permissions[module] || [];
    const updated = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action];
    onChange({ ...permissions, [module]: updated });
  }

  function toggleModule(module: Module) {
    if (readOnly) return;
    const current = permissions[module] || [];
    const allActions = [...ACTIONS];
    const hasAll = allActions.every((a) => current.includes(a));
    onChange({ ...permissions, [module]: hasAll ? [] : allActions });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              <button onClick={() => setExpanded(!expanded)} className="hover:text-foreground">
                Module {expanded ? "▾" : "▸"}
              </button>
            </th>
            {ACTIONS.map((action) => (
              <th key={action} className="px-3 py-3 text-center font-medium capitalize text-muted-foreground">
                {action}
              </th>
            ))}
          </tr>
        </thead>
        {expanded && (
          <tbody>
            {MODULES.map((module) => (
              <tr key={module} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleModule(module)}
                    className="font-medium capitalize text-foreground hover:text-primary"
                    disabled={readOnly}
                  >
                    {module.replace(/_/g, " ")}
                  </button>
                </td>
                {ACTIONS.map((action) => {
                  const checked = permissions[module]?.includes(action) || false;
                  return (
                    <td key={action} className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(module, action)}
                        disabled={readOnly}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}
