"use client";

import { createContext, useContext } from "react";
import type { OrgRole } from "@prisma/client";
import type { PermissionMap } from "@/types/permissions";

export interface OrgContextValue {
  organizationId: string | null;
  organizationName: string | null;
  orgRole: OrgRole | null;
  permissions: PermissionMap;
  subsidiaryId: string | null;
  departmentId: string | null;
}

export const OrgContext = createContext<OrgContextValue>({
  organizationId: null,
  organizationName: null,
  orgRole: null,
  permissions: {},
  subsidiaryId: null,
  departmentId: null,
});

export function useOrg() {
  return useContext(OrgContext);
}
