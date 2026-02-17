"use client";

import { useState, useEffect } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";

interface OrgOption {
  id: string;
  name: string;
  slug: string;
}

interface OrgSwitcherProps {
  currentOrgId: string | null;
  onSwitch: (orgId: string) => void;
}

export function OrgSwitcher({ currentOrgId, onSwitch }: OrgSwitcherProps) {
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/organization")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setOrgs(data);
        else if (data?.id) setOrgs([data]);
      })
      .catch(() => {});
  }, []);

  const current = orgs.find((o) => o.id === currentOrgId) || orgs[0];

  if (orgs.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-accent transition-colors"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
          <Building2 className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="flex-1 truncate text-left font-medium">
          {current?.name || "Select Organization"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-card p-1 shadow-lg">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  onSwitch(org.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 text-left">{org.name}</span>
                {org.id === currentOrgId && (
                  <Check className="h-3.5 w-3.5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
