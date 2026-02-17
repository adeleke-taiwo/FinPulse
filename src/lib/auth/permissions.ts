import type { OrgRole } from "@prisma/client";
import {
  DEFAULT_PERMISSIONS,
  type Module,
  type Action,
  type PermissionMap,
} from "@/types/permissions";

export interface MemberContext {
  role: OrgRole;
  customPermissions?: PermissionMap | null;
}

export function canAccess(
  member: MemberContext | null | undefined,
  module: Module,
  action: Action
): boolean {
  if (!member) return false;

  // Check custom role permissions first
  if (member.customPermissions) {
    const moduleActions = member.customPermissions[module];
    if (moduleActions && moduleActions.includes(action)) return true;
  }

  // Fall back to default role permissions
  const defaults = DEFAULT_PERMISSIONS[member.role];
  if (!defaults) return false;

  const allowed = defaults[module];
  return !!allowed && allowed.includes(action);
}

export function getEffectivePermissions(member: MemberContext): PermissionMap {
  const defaults = DEFAULT_PERMISSIONS[member.role] || {};
  if (!member.customPermissions) return { ...defaults };

  // Merge: custom permissions override defaults
  const merged: PermissionMap = { ...defaults };
  for (const [mod, actions] of Object.entries(member.customPermissions)) {
    if (actions && actions.length > 0) {
      merged[mod as Module] = actions;
    }
  }
  return merged;
}

export function hasAnyPermission(
  member: MemberContext | null | undefined,
  module: Module
): boolean {
  if (!member) return false;
  const perms = getEffectivePermissions(member);
  const actions = perms[module];
  return !!actions && actions.length > 0;
}
