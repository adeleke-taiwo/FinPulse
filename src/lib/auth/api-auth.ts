import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { canAccess, type MemberContext } from "@/lib/auth/permissions";
import type { Module, Action } from "@/types/permissions";
import type { OrgRole } from "@prisma/client";

function mapLegacyRole(role?: string): OrgRole {
  switch (role) {
    case "ADMIN":
      return "SUPER_ADMIN";
    case "ANALYST":
      return "ANALYST";
    default:
      return "EMPLOYEE";
  }
}

interface AuthResult {
  session: Session;
  orgRole: OrgRole;
  member: MemberContext;
  userId: string;
}

/**
 * Require authentication for an API route.
 * Returns the session info or a NextResponse error.
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as {
    id: string;
    role?: string;
    orgRole?: string;
    customPermissions?: Record<string, string[]> | null;
  };

  const orgRole = (user.orgRole || mapLegacyRole(user.role)) as OrgRole;
  const member: MemberContext = {
    role: orgRole,
    customPermissions: (user.customPermissions as MemberContext["customPermissions"]) || null,
  };

  return { session, orgRole, member, userId: user.id };
}

/**
 * Require a specific permission for an API route.
 * Returns the session info or a NextResponse error.
 */
export async function requirePermission(
  module: Module,
  action: Action = "view"
): Promise<AuthResult | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;

  if (!canAccess(result.member, module, action)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return result;
}

/** Type guard to check if result is an error response */
export function isAuthError(
  result: AuthResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
