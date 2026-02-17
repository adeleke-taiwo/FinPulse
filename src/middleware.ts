import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/register"];

type OrgRoleKey =
  | "SUPER_ADMIN"
  | "CFO"
  | "FINANCE_MANAGER"
  | "DEPARTMENT_HEAD"
  | "ANALYST"
  | "EMPLOYEE"
  | "AUDITOR"
  | "EXTERNAL_ACCOUNTANT";

// Map legacy User.role → OrgRole for backward compatibility
function mapLegacyRole(role?: string): OrgRoleKey {
  switch (role) {
    case "ADMIN":
      return "SUPER_ADMIN";
    case "ANALYST":
      return "ANALYST";
    default:
      return "EMPLOYEE";
  }
}

// OrgRole-based route access mapping
// Routes not listed here are accessible to all authenticated users
// More specific paths are checked before less specific ones
const routeAccess: [string, OrgRoleKey[]][] = [
  // Admin — most restrictive first
  ["/admin/roles", ["SUPER_ADMIN"]],
  ["/admin/workflows", ["SUPER_ADMIN"]],
  ["/settings/security", ["SUPER_ADMIN"]],
  ["/admin", ["SUPER_ADMIN", "CFO"]],
  ["/api/admin", ["SUPER_ADMIN", "CFO"]],
  ["/api/cron", ["SUPER_ADMIN"]],

  // Executive
  ["/executive", ["SUPER_ADMIN", "CFO", "AUDITOR"]],
  ["/api/executive", ["SUPER_ADMIN", "CFO", "AUDITOR"]],

  // Finance — budgets has wider access than other finance pages
  ["/finance/budgets", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "DEPARTMENT_HEAD", "AUDITOR", "EXTERNAL_ACCOUNTANT"]],
  ["/finance", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "AUDITOR", "EXTERNAL_ACCOUNTANT"]],
  ["/api/finance/budgets", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "DEPARTMENT_HEAD", "AUDITOR", "EXTERNAL_ACCOUNTANT"]],
  ["/api/finance", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "AUDITOR", "EXTERNAL_ACCOUNTANT"]],

  // Risk & Compliance
  ["/audit-log", ["SUPER_ADMIN", "AUDITOR"]],
  ["/api/audit-log", ["SUPER_ADMIN", "AUDITOR"]],
  ["/risk", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "AUDITOR"]],
  ["/api/risk", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "AUDITOR"]],
  ["/compliance", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "AUDITOR"]],

  // Analytics & Reports
  ["/analytics", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "ANALYST", "AUDITOR", "DEPARTMENT_HEAD"]],
  ["/api/analytics", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "ANALYST", "AUDITOR", "DEPARTMENT_HEAD"]],
  ["/reports", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "ANALYST", "AUDITOR"]],
  ["/api/reports", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "ANALYST", "AUDITOR"]],

  // Operations
  ["/approvals", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "DEPARTMENT_HEAD", "AUDITOR"]],
  ["/api/approvals", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "DEPARTMENT_HEAD", "AUDITOR"]],
  ["/departments", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "DEPARTMENT_HEAD", "AUDITOR"]],
  ["/api/departments", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "DEPARTMENT_HEAD", "AUDITOR"]],

  // Transactions — most roles can view, EMPLOYEE included (they see their own)
  ["/transactions", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "DEPARTMENT_HEAD", "ANALYST", "AUDITOR", "EXTERNAL_ACCOUNTANT"]],
  ["/api/transactions", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "DEPARTMENT_HEAD", "ANALYST", "AUDITOR", "EXTERNAL_ACCOUNTANT"]],

  // Data & Integrations
  ["/data-sources", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "ANALYST"]],
  ["/api/data-sources", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "ANALYST"]],
  ["/integrations", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "ANALYST"]],

  // Upload
  ["/upload", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "ANALYST"]],
  ["/api/upload", ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "ANALYST"]],
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const secureCookie = req.nextUrl.protocol === "https:";
  const cookieName = secureCookie
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    const token = await getToken({ req, secret, cookieName });
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Allow API auth routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Require auth for all other routes
  const token = await getToken({ req, secret, cookieName });
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Resolve OrgRole (prefer orgRole, fall back to mapping User.role)
  const orgRole: OrgRoleKey = (token.orgRole as OrgRoleKey) || mapLegacyRole(token.role as string);

  // Check route access — first matching rule wins (most specific first)
  for (const [path, roles] of routeAccess) {
    if (pathname.startsWith(path) && !roles.includes(orgRole)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
};
