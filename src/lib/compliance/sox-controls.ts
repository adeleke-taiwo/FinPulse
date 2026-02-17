export interface SOXControl {
  id: string;
  category: string;
  name: string;
  description: string;
  status: "pass" | "fail" | "warning" | "not_tested";
  lastTested: string | null;
  evidence: string;
}

export function getSOXControls(): SOXControl[] {
  return [
    // Financial Close Controls
    {
      id: "FC-01",
      category: "Financial Close",
      name: "Journal Entry Authorization",
      description: "All journal entries require approval before posting",
      status: "pass",
      lastTested: "2026-02-01",
      evidence: "Workflow approval required for all JE status transitions",
    },
    {
      id: "FC-02",
      category: "Financial Close",
      name: "Period Close Segregation",
      description: "Period close requires authorized personnel",
      status: "pass",
      lastTested: "2026-02-01",
      evidence: "Only CFO and Finance Manager can close fiscal periods",
    },
    {
      id: "FC-03",
      category: "Financial Close",
      name: "Trial Balance Reconciliation",
      description: "Trial balance debits equal credits",
      status: "pass",
      lastTested: "2026-02-01",
      evidence: "Double-entry validation enforced at journal entry creation",
    },

    // Access Controls
    {
      id: "AC-01",
      category: "Access Controls",
      name: "Role-Based Access Control",
      description: "Users have access only to modules required for their role",
      status: "pass",
      lastTested: "2026-02-01",
      evidence: "Permission matrix enforced via canAccess() middleware",
    },
    {
      id: "AC-02",
      category: "Access Controls",
      name: "Segregation of Duties",
      description: "No single user can both create and approve transactions",
      status: "warning",
      lastTested: "2026-02-01",
      evidence: "SoD conflicts detected for CFO and Finance Manager roles",
    },
    {
      id: "AC-03",
      category: "Access Controls",
      name: "User Authentication",
      description: "Secure authentication with hashed passwords",
      status: "pass",
      lastTested: "2026-02-01",
      evidence: "bcrypt password hashing, JWT session management",
    },

    // AP/AR Controls
    {
      id: "AP-01",
      category: "Accounts Payable",
      name: "Invoice Approval Workflow",
      description: "Vendor invoices require approval before payment",
      status: "pass",
      lastTested: "2026-02-01",
      evidence: "Multi-step approval workflow with configurable thresholds",
    },
    {
      id: "AP-02",
      category: "Accounts Payable",
      name: "Vendor Master Data Changes",
      description: "Changes to vendor bank details require approval",
      status: "pass",
      lastTested: "2026-01-15",
      evidence: "Vendor onboarding workflow template with audit trail",
    },
    {
      id: "AR-01",
      category: "Accounts Receivable",
      name: "Credit Limit Enforcement",
      description: "Customer credit limits are monitored",
      status: "pass",
      lastTested: "2026-01-15",
      evidence: "Credit limit field on Customer model, enforced at invoice creation",
    },

    // Expense Controls
    {
      id: "EX-01",
      category: "Expenses",
      name: "Expense Policy Enforcement",
      description: "Expense submissions validated against policy limits",
      status: "pass",
      lastTested: "2026-02-01",
      evidence: "Policy validation engine checks category limits and receipt requirements",
    },
    {
      id: "EX-02",
      category: "Expenses",
      name: "Receipt Requirements",
      description: "Receipts required for expenses over $25",
      status: "pass",
      lastTested: "2026-02-01",
      evidence: "Automated policy violation flagging at submission",
    },

    // IT Controls
    {
      id: "IT-01",
      category: "IT Controls",
      name: "Audit Trail",
      description: "All user actions are logged with timestamps",
      status: "pass",
      lastTested: "2026-02-01",
      evidence: "AuditLog model tracks all CRUD operations",
    },
    {
      id: "IT-02",
      category: "IT Controls",
      name: "Data Backup",
      description: "Database backups performed regularly",
      status: "pass",
      lastTested: "2026-01-30",
      evidence: "Neon database with automated point-in-time recovery",
    },
    {
      id: "IT-03",
      category: "IT Controls",
      name: "Change Management",
      description: "System changes follow controlled deployment process",
      status: "pass",
      lastTested: "2026-01-30",
      evidence: "Git-based version control, PR review process",
    },
  ];
}

export function getSOXSummary() {
  const controls = getSOXControls();
  const total = controls.length;
  const pass = controls.filter((c) => c.status === "pass").length;
  const fail = controls.filter((c) => c.status === "fail").length;
  const warning = controls.filter((c) => c.status === "warning").length;
  const notTested = controls.filter((c) => c.status === "not_tested").length;

  return {
    total,
    pass,
    fail,
    warning,
    notTested,
    complianceRate: total > 0 ? Math.round((pass / total) * 100) : 0,
    controls,
  };
}
