export interface PolicyViolation {
  rule: string;
  message: string;
  severity: "warning" | "error";
}

interface ExpenseInput {
  amount: number;
  categorySlug?: string | null;
  receiptUrl?: string | null;
  title: string;
}

const CATEGORY_LIMITS: Record<string, number> = {
  meals: 150,
  travel: 5000,
  accommodation: 500,
  transportation: 300,
  office_supplies: 1000,
  software: 2500,
  training: 5000,
};

const RECEIPT_REQUIRED_THRESHOLD = 25;

export function validateExpensePolicy(expense: ExpenseInput): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  // Receipt required above threshold
  if (expense.amount > RECEIPT_REQUIRED_THRESHOLD && !expense.receiptUrl) {
    violations.push({
      rule: "receipt_required",
      message: `Receipt required for expenses over $${RECEIPT_REQUIRED_THRESHOLD}`,
      severity: "error",
    });
  }

  // Category-specific limits
  if (expense.categorySlug && CATEGORY_LIMITS[expense.categorySlug]) {
    const limit = CATEGORY_LIMITS[expense.categorySlug];
    if (expense.amount > limit) {
      violations.push({
        rule: "category_limit_exceeded",
        message: `${expense.categorySlug} expenses are limited to $${limit}. Amount: $${expense.amount.toFixed(2)}`,
        severity: "warning",
      });
    }
  }

  // General high-value warning
  if (expense.amount > 10000) {
    violations.push({
      rule: "high_value_expense",
      message: "Expenses over $10,000 require CFO approval",
      severity: "warning",
    });
  }

  // Missing description check
  if (!expense.title || expense.title.trim().length < 5) {
    violations.push({
      rule: "insufficient_description",
      message: "Expense title must be at least 5 characters",
      severity: "error",
    });
  }

  return violations;
}

export function getApprovalThresholds() {
  return {
    autoApprove: 50,       // Under $50 auto-approved
    managerApproval: 5000, // $50-$5000 needs department head
    financeApproval: 25000, // $5000-$25000 needs finance manager
    cfoApproval: Infinity,  // Over $25000 needs CFO
  };
}

export function determineApprovalLevel(amount: number): string {
  const thresholds = getApprovalThresholds();
  if (amount <= thresholds.autoApprove) return "auto";
  if (amount <= thresholds.managerApproval) return "department_head";
  if (amount <= thresholds.financeApproval) return "finance_manager";
  return "cfo";
}
