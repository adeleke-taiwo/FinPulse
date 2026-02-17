"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Database,
  ShieldAlert,
  ScrollText,
  Settings,
  TrendingUp,
  Users,
  Target,
  AlertTriangle,
  BookOpen,
  Receipt,
  FileText,
  CreditCard,
  Wallet,
  PieChart,
  CheckSquare,
  Building2,
  Shield,
  UserCog,
  KeyRound,
  Workflow,
  Landmark,
  LineChart,
  FolderTree,
  Plug,
  Lock,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── OrgRole hierarchy (highest to lowest) ──
// SUPER_ADMIN > CFO > FINANCE_MANAGER > DEPARTMENT_HEAD > EMPLOYEE
// AUDITOR = special cross-cutting read-only role

type OrgRoleKey =
  | "SUPER_ADMIN"
  | "CFO"
  | "FINANCE_MANAGER"
  | "DEPARTMENT_HEAD"
  | "ANALYST"
  | "EMPLOYEE"
  | "AUDITOR"
  | "EXTERNAL_ACCOUNTANT";

interface NavSection {
  title: string;
  items: NavItem[];
  /** If set, the entire section is only visible to these OrgRoles */
  roles?: OrgRoleKey[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** OrgRoles that can see this item. If omitted, visible to all. */
  roles?: OrgRoleKey[];
  badge?: string;
  children?: { label: string; href: string; icon: React.ReactNode }[];
}

const ALL_FINANCE_ROLES: OrgRoleKey[] = ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "AUDITOR", "EXTERNAL_ACCOUNTANT"];
const MANAGEMENT_UP: OrgRoleKey[] = ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "DEPARTMENT_HEAD", "AUDITOR"];
const EXECUTIVE_ROLES: OrgRoleKey[] = ["SUPER_ADMIN", "CFO", "AUDITOR"];
const ADMIN_ONLY: OrgRoleKey[] = ["SUPER_ADMIN"];
const ADMIN_CFO: OrgRoleKey[] = ["SUPER_ADMIN", "CFO"];

const navSections: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        label: "Executive Dashboard",
        href: "/executive",
        icon: <Briefcase className="h-4 w-4" />,
        roles: EXECUTIVE_ROLES,
      },
    ],
  },
  {
    title: "FINANCE",
    roles: ALL_FINANCE_ROLES,
    items: [
      {
        label: "General Ledger",
        href: "/finance/gl",
        icon: <BookOpen className="h-4 w-4" />,
        roles: ALL_FINANCE_ROLES,
        children: [
          { label: "Chart of Accounts", href: "/finance/gl", icon: <FolderTree className="h-4 w-4" /> },
          { label: "Journal Entries", href: "/finance/journal", icon: <FileText className="h-4 w-4" /> },
          { label: "Financial Statements", href: "/finance/statements", icon: <LineChart className="h-4 w-4" /> },
          { label: "Fiscal Periods", href: "/finance/periods", icon: <Target className="h-4 w-4" /> },
        ],
      },
      {
        label: "Accounts Payable",
        href: "/finance/ap",
        icon: <CreditCard className="h-4 w-4" />,
        roles: ALL_FINANCE_ROLES,
      },
      {
        label: "Accounts Receivable",
        href: "/finance/ar",
        icon: <Wallet className="h-4 w-4" />,
        roles: ALL_FINANCE_ROLES,
      },
      {
        label: "Budgets",
        href: "/finance/budgets",
        icon: <PieChart className="h-4 w-4" />,
        roles: [...ALL_FINANCE_ROLES, "DEPARTMENT_HEAD"],
      },
      {
        label: "Expenses",
        href: "/expenses",
        icon: <Receipt className="h-4 w-4" />,
        // Everyone can see expenses (their own)
      },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      {
        label: "Transactions",
        href: "/transactions",
        icon: <ArrowLeftRight className="h-4 w-4" />,
        roles: [...ALL_FINANCE_ROLES, "DEPARTMENT_HEAD", "ANALYST"],
      },
      {
        label: "Approvals",
        href: "/approvals",
        icon: <CheckSquare className="h-4 w-4" />,
        roles: MANAGEMENT_UP,
      },
      {
        label: "Departments",
        href: "/departments",
        icon: <Building2 className="h-4 w-4" />,
        roles: MANAGEMENT_UP,
      },
    ],
  },
  {
    title: "ANALYTICS",
    roles: [...ALL_FINANCE_ROLES, "DEPARTMENT_HEAD", "ANALYST"],
    items: [
      {
        label: "Analytics",
        href: "/analytics",
        icon: <BarChart3 className="h-4 w-4" />,
        roles: ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "ANALYST", "AUDITOR"],
        children: [
          { label: "Revenue", href: "/analytics/revenue", icon: <TrendingUp className="h-4 w-4" /> },
          { label: "Cohorts", href: "/analytics/cohorts", icon: <Users className="h-4 w-4" /> },
          { label: "KPIs", href: "/analytics/kpis", icon: <Target className="h-4 w-4" /> },
          { label: "Anomalies", href: "/analytics/anomalies", icon: <AlertTriangle className="h-4 w-4" /> },
        ],
      },
      {
        label: "Reports",
        href: "/reports",
        icon: <FileText className="h-4 w-4" />,
        roles: ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "AUDITOR", "ANALYST"],
      },
      {
        label: "Forecasting",
        href: "/finance/forecasting",
        icon: <LineChart className="h-4 w-4" />,
        roles: ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "ANALYST"],
      },
    ],
  },
  {
    title: "RISK & COMPLIANCE",
    roles: ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "AUDITOR"],
    items: [
      {
        label: "Risk Management",
        href: "/risk",
        icon: <ShieldAlert className="h-4 w-4" />,
        roles: ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "AUDITOR"],
      },
      {
        label: "Compliance",
        href: "/compliance",
        icon: <Shield className="h-4 w-4" />,
        roles: ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "AUDITOR"],
      },
      {
        label: "Audit Log",
        href: "/audit-log",
        icon: <ScrollText className="h-4 w-4" />,
        roles: ["SUPER_ADMIN", "AUDITOR"],
      },
    ],
  },
  {
    title: "DATA & INTEGRATIONS",
    roles: ["SUPER_ADMIN", "CFO", "FINANCE_MANAGER", "ANALYST"],
    items: [
      {
        label: "Data Sources",
        href: "/data-sources",
        icon: <Database className="h-4 w-4" />,
      },
      {
        label: "Integrations",
        href: "/integrations",
        icon: <Plug className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "ADMIN",
    roles: ADMIN_CFO,
    items: [
      {
        label: "Organization",
        href: "/admin/organization",
        icon: <Landmark className="h-4 w-4" />,
        roles: ADMIN_CFO,
      },
      {
        label: "Roles & Permissions",
        href: "/admin/roles",
        icon: <KeyRound className="h-4 w-4" />,
        roles: ADMIN_ONLY,
      },
      {
        label: "Members",
        href: "/admin/members",
        icon: <UserCog className="h-4 w-4" />,
        roles: ADMIN_CFO,
      },
      {
        label: "Departments",
        href: "/admin/departments",
        icon: <FolderTree className="h-4 w-4" />,
        roles: ADMIN_CFO,
      },
      {
        label: "Workflows",
        href: "/admin/workflows",
        icon: <Workflow className="h-4 w-4" />,
        roles: ADMIN_ONLY,
      },
      {
        label: "Settings",
        href: "/settings",
        icon: <Settings className="h-4 w-4" />,
        roles: ADMIN_CFO,
      },
      {
        label: "Security",
        href: "/settings/security",
        icon: <Lock className="h-4 w-4" />,
        roles: ADMIN_ONLY,
      },
    ],
  },
];

// Display-friendly role labels
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  CFO: "CFO",
  FINANCE_MANAGER: "Finance Manager",
  DEPARTMENT_HEAD: "Dept. Head",
  ANALYST: "Analyst",
  EMPLOYEE: "Employee",
  AUDITOR: "Auditor",
  EXTERNAL_ACCOUNTANT: "External Accountant",
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Prefer OrgRole, fall back to mapping User.role → OrgRole
  const user = session?.user as {
    role?: string;
    orgRole?: string;
    name?: string;
  } | undefined;

  const orgRole: string = user?.orgRole || mapLegacyRole(user?.role);

  function mapLegacyRole(legacyRole?: string): string {
    switch (legacyRole) {
      case "ADMIN": return "SUPER_ADMIN";
      case "ANALYST": return "ANALYST";
      default: return "EMPLOYEE";
    }
  }

  function hasAccess(roles?: OrgRoleKey[]): boolean {
    if (!roles) return true;
    return roles.includes(orgRole as OrgRoleKey);
  }

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <TrendingUp className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-foreground">FinPulse</span>
        <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          ERP
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {navSections.map((section) => {
          // Check section-level role gate
          if (section.roles && !hasAccess(section.roles)) return null;

          const visibleItems = section.items.filter((item) => hasAccess(item.roles));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="mb-3">
              <h3 className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h3>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                        pathname === item.href || pathname.startsWith(item.href + "/") ||
                        (item.children && item.children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/")))
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {item.icon}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                    {item.children && (pathname.startsWith(item.href) || item.children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"))) && (
                      <ul className="ml-7 mt-0.5 space-y-0.5">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                                pathname === child.href
                                  ? "text-primary"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {child.icon}
                              <span className="truncate">{child.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-2">
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <p className="truncate text-xs font-medium text-foreground">
            {user?.name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {ROLE_LABELS[orgRole] || orgRole}
          </p>
        </div>
      </div>
    </aside>
  );
}
