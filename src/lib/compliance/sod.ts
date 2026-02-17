import type { OrgRole } from "@prisma/client";
import type { Module, Action } from "@/types/permissions";
import { DEFAULT_PERMISSIONS } from "@/types/permissions";

export interface SoDConflict {
  role: OrgRole;
  conflictType: string;
  module1: string;
  action1: string;
  module2: string;
  action2: string;
  severity: "high" | "medium" | "low";
  description: string;
}

// Segregation of Duties conflict rules
const SOD_RULES: {
  module1: Module;
  action1: Action;
  module2: Module;
  action2: Action;
  conflictType: string;
  severity: "high" | "medium" | "low";
  description: string;
}[] = [
  {
    module1: "ap",
    action1: "create",
    module2: "ap",
    action2: "approve",
    conflictType: "AP Create + Approve",
    severity: "high",
    description: "Same person can create and approve vendor invoices",
  },
  {
    module1: "ar",
    action1: "create",
    module2: "ar",
    action2: "approve",
    conflictType: "AR Create + Approve",
    severity: "high",
    description: "Same person can create and approve customer invoices",
  },
  {
    module1: "gl",
    action1: "create",
    module2: "gl",
    action2: "approve",
    conflictType: "GL Create + Approve",
    severity: "high",
    description: "Same person can create and approve journal entries",
  },
  {
    module1: "expenses",
    action1: "create",
    module2: "expenses",
    action2: "approve",
    conflictType: "Expense Create + Approve",
    severity: "medium",
    description: "Same person can submit and approve expenses",
  },
  {
    module1: "admin",
    action1: "edit",
    module2: "audit",
    action2: "delete",
    conflictType: "Admin + Audit Delete",
    severity: "high",
    description: "Admin user can modify settings and delete audit logs",
  },
  {
    module1: "budgets",
    action1: "create",
    module2: "budgets",
    action2: "approve",
    conflictType: "Budget Create + Approve",
    severity: "medium",
    description: "Same person can create and approve budgets",
  },
  {
    module1: "ap",
    action1: "create",
    module2: "gl",
    action2: "edit",
    conflictType: "AP + GL Edit",
    severity: "medium",
    description: "Same person can create AP invoices and edit GL entries",
  },
];

export function detectSoDConflicts(): SoDConflict[] {
  const conflicts: SoDConflict[] = [];

  for (const role of Object.keys(DEFAULT_PERMISSIONS) as OrgRole[]) {
    const perms = DEFAULT_PERMISSIONS[role];

    for (const rule of SOD_RULES) {
      const has1 = perms[rule.module1]?.includes(rule.action1);
      const has2 = perms[rule.module2]?.includes(rule.action2);

      if (has1 && has2) {
        conflicts.push({
          role,
          conflictType: rule.conflictType,
          module1: rule.module1,
          action1: rule.action1,
          module2: rule.module2,
          action2: rule.action2,
          severity: rule.severity,
          description: rule.description,
        });
      }
    }
  }

  return conflicts;
}

export function getSoDMatrix(): {
  roles: OrgRole[];
  conflicts: Record<string, SoDConflict[]>;
} {
  const allConflicts = detectSoDConflicts();
  const grouped: Record<string, SoDConflict[]> = {};

  for (const conflict of allConflicts) {
    if (!grouped[conflict.role]) grouped[conflict.role] = [];
    grouped[conflict.role].push(conflict);
  }

  return {
    roles: Object.keys(DEFAULT_PERMISSIONS) as OrgRole[],
    conflicts: grouped,
  };
}
