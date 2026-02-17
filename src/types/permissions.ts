import type { OrgRole } from "@prisma/client";

export const MODULES = [
  "dashboard",
  "transactions",
  "analytics",
  "expenses",
  "ap",
  "ar",
  "gl",
  "budgets",
  "risk",
  "audit",
  "reports",
  "admin",
  "settings",
  "compliance",
  "integrations",
  "executive",
  "departments",
  "approvals",
  "workflows",
] as const;

export type Module = (typeof MODULES)[number];

export const ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "export",
] as const;

export type Action = (typeof ACTIONS)[number];

export type PermissionMap = Partial<Record<Module, Action[]>>;

export const DEFAULT_PERMISSIONS: Record<OrgRole, PermissionMap> = {
  SUPER_ADMIN: Object.fromEntries(
    MODULES.map((m) => [m, [...ACTIONS]])
  ) as PermissionMap,

  CFO: {
    dashboard: ["view", "export"],
    executive: ["view", "export"],
    transactions: ["view", "export"],
    analytics: ["view", "export"],
    expenses: ["view", "approve", "export"],
    ap: ["view", "approve", "export"],
    ar: ["view", "approve", "export"],
    gl: ["view", "create", "edit", "approve", "export"],
    budgets: ["view", "create", "edit", "approve", "export"],
    risk: ["view", "export"],
    audit: ["view", "export"],
    reports: ["view", "create", "export"],
    compliance: ["view", "export"],
    integrations: ["view"],
    departments: ["view", "export"],
    approvals: ["view", "approve"],
    admin: ["view"],
    settings: ["view", "edit"],
    workflows: ["view", "create", "edit"],
  },

  FINANCE_MANAGER: {
    dashboard: ["view"],
    transactions: ["view", "create", "edit", "export"],
    analytics: ["view", "export"],
    expenses: ["view", "approve", "export"],
    ap: ["view", "create", "edit", "approve", "export"],
    ar: ["view", "create", "edit", "approve", "export"],
    gl: ["view", "create", "edit", "export"],
    budgets: ["view", "create", "edit", "export"],
    risk: ["view"],
    audit: ["view"],
    reports: ["view", "create", "export"],
    compliance: ["view"],
    departments: ["view"],
    approvals: ["view", "approve"],
    settings: ["view"],
    workflows: ["view"],
  },

  DEPARTMENT_HEAD: {
    dashboard: ["view"],
    transactions: ["view"],
    analytics: ["view"],
    expenses: ["view", "create", "approve", "export"],
    budgets: ["view", "create", "edit"],
    departments: ["view", "edit"],
    approvals: ["view", "approve"],
    reports: ["view"],
    settings: ["view"],
  },

  ANALYST: {
    dashboard: ["view"],
    transactions: ["view", "export"],
    analytics: ["view", "export"],
    ap: ["view", "export"],
    ar: ["view", "export"],
    gl: ["view", "export"],
    budgets: ["view", "export"],
    risk: ["view", "export"],
    reports: ["view", "create", "export"],
    departments: ["view"],
    settings: ["view"],
  },

  EMPLOYEE: {
    dashboard: ["view"],
    expenses: ["view", "create"],
    transactions: ["view"],
    settings: ["view", "edit"],
  },

  AUDITOR: {
    dashboard: ["view"],
    executive: ["view"],
    transactions: ["view", "export"],
    analytics: ["view", "export"],
    expenses: ["view", "export"],
    ap: ["view", "export"],
    ar: ["view", "export"],
    gl: ["view", "export"],
    budgets: ["view", "export"],
    risk: ["view", "export"],
    audit: ["view", "export"],
    reports: ["view", "export"],
    compliance: ["view", "export"],
    departments: ["view"],
    approvals: ["view"],
    settings: ["view"],
  },

  EXTERNAL_ACCOUNTANT: {
    gl: ["view", "create", "edit", "export"],
    ap: ["view", "export"],
    ar: ["view", "export"],
    reports: ["view", "export"],
    compliance: ["view"],
    settings: ["view"],
  },
};
