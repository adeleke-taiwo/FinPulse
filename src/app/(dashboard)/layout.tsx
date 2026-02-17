"use client";

import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { OrgContext, type OrgContextValue } from "@/lib/auth/org-context";
import { DEFAULT_PERMISSIONS } from "@/types/permissions";
import type { OrgRole } from "@prisma/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();

  const user = session?.user;
  const orgContext: OrgContextValue = {
    organizationId: user?.organizationId ?? null,
    organizationName: user?.organizationName ?? null,
    orgRole: (user?.orgRole as OrgRole | null) ?? null,
    permissions:
      user?.customPermissions ||
      DEFAULT_PERMISSIONS[(user?.orgRole as OrgRole) || "EMPLOYEE"] ||
      {},
    subsidiaryId: null,
    departmentId: user?.departmentId ?? null,
  };

  return (
    <OrgContext.Provider value={orgContext}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col pl-64">
          <TopNav />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </OrgContext.Provider>
  );
}
