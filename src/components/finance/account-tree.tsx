"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface GLAccountNode {
  id: string;
  code: string;
  name: string;
  classification: string;
  balance?: number;
  children?: GLAccountNode[];
}

interface AccountTreeProps {
  accounts: GLAccountNode[];
  onSelect?: (accountId: string) => void;
  selectedId?: string | null;
}

function AccountTreeItem({
  account,
  depth,
  onSelect,
  selectedId,
}: {
  account: GLAccountNode;
  depth: number;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = account.children && account.children.length > 0;

  const classColors: Record<string, string> = {
    ASSET: "text-blue-500",
    LIABILITY: "text-red-500",
    EQUITY: "text-purple-500",
    REVENUE: "text-green-500",
    EXPENSE: "text-orange-500",
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent transition-colors",
          selectedId === account.id && "bg-primary/10 text-primary"
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => onSelect?.(account.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-3.5" />
        )}
        {hasChildren ? (
          <Folder className="h-4 w-4 text-muted-foreground" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-mono text-xs text-muted-foreground">{account.code}</span>
        <span className="flex-1 truncate">{account.name}</span>
        <span className={cn("text-xs font-medium", classColors[account.classification] || "")}>
          {account.classification}
        </span>
        {account.balance !== undefined && (
          <span className="font-mono text-xs tabular-nums">
            {formatCurrency(account.balance)}
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {account.children!.map((child) => (
            <AccountTreeItem
              key={child.id}
              account={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AccountTree({ accounts, onSelect, selectedId }: AccountTreeProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Chart of Accounts</h3>
      </div>
      <div className="max-h-[600px] overflow-y-auto p-2">
        {accounts.map((account) => (
          <AccountTreeItem
            key={account.id}
            account={account}
            depth={0}
            onSelect={onSelect}
            selectedId={selectedId}
          />
        ))}
      </div>
    </div>
  );
}
