export type Role = "ADMIN" | "ANALYST" | "USER";

export type AccountType = "CHECKING" | "SAVINGS" | "INVESTMENT" | "CREDIT" | "LOAN";
export type AccountStatus = "ACTIVE" | "INACTIVE" | "FROZEN" | "CLOSED";

export type TransactionType = "CREDIT" | "DEBIT" | "TRANSFER" | "FEE" | "INTEREST" | "REFUND";
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";

export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RiskStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";

export type UploadStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type TimeGranularity = "daily" | "weekly" | "monthly";

export interface KPICard {
  title: string;
  value: string;
  change: number;
  trend: number[];
  icon: string;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface CohortCell {
  cohort: string;
  period: number;
  retention: number;
}

export interface AnomalyPoint {
  id: string;
  amount: number;
  zScore: number;
  date: string;
  category: string;
  isFlagged: boolean;
}

export interface CryptoPrice {
  time: string;
  symbol: string;
  price: number;
  volume: number;
  change24h: number;
}

export interface GitHubActivity {
  time: string;
  repo: string;
  commits: number;
  pullRequests: number;
  issues: number;
}

export interface ColumnMapping {
  source: string;
  target: string;
}

export interface UploadValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: { row: number; field: string; message: string }[];
}

// ── ERP Types ──

export type OrgRoleType =
  | "SUPER_ADMIN"
  | "CFO"
  | "FINANCE_MANAGER"
  | "DEPARTMENT_HEAD"
  | "ANALYST"
  | "EMPLOYEE"
  | "AUDITOR"
  | "EXTERNAL_ACCOUNTANT";

export type AccountClassification = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export type JournalStatusType = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "POSTED" | "REVERSED";

export type ExpenseStatusType = "DRAFT" | "SUBMITTED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "REIMBURSED";

export type InvoiceStatusType = "RECEIVED" | "PENDING_APPROVAL" | "APPROVED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "DISPUTED" | "VOID";

export type CustomerInvoiceStatusType = "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "VOID";

export type BudgetStatusType = "DRAFT" | "SUBMITTED" | "APPROVED" | "ACTIVE" | "CLOSED";

export type WorkflowStatusType = "IN_PROGRESS" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface ExecutiveDashboardData {
  revenue: number;
  expenses: number;
  netIncome: number;
  cashPosition: number;
  apOutstanding: { count: number; amount: number };
  arOutstanding: { count: number; amount: number };
  revenueChange: number;
  expenseChange: number;
  monthlyPnL: { month: string; revenue: number; expenses: number }[];
  recentJournalEntries: {
    id: string;
    entryNumber: string;
    description: string;
    date: string;
    status: string;
    amount: number;
  }[];
}
