import { prisma } from "@/lib/db";

export interface BudgetVariance {
  glAccountId: string;
  accountCode: string;
  accountName: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: "under" | "on_track" | "over";
}

export interface DepartmentKPI {
  id: string;
  name: string;
  head: string;
  totalBudget: number;
  totalSpent: number;
  utilization: number;
  headcount: number;
  costPerEmployee: number;
  topCategories: { category: string; amount: number }[];
  spendingTrend: { month: string; amount: number }[];
  members: {
    id: string;
    name: string;
    role: string;
    email: string;
    joinedAt: string;
  }[];
}

export async function getBudgetVariance(budgetId: string): Promise<BudgetVariance[]> {
  const budget = await prisma.budget.findUniqueOrThrow({
    where: { id: budgetId },
    include: {
      lineItems: {
        include: { glAccount: { select: { code: true, name: true } } },
      },
    },
  });

  return budget.lineItems.map((item) => {
    const budgeted = Number(item.totalAmount);
    const actual = Number(item.actualAmount);
    const variance = budgeted - actual;
    const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;

    let status: "under" | "on_track" | "over";
    if (actual > budgeted * 1.1) status = "over";
    else if (actual < budgeted * 0.9) status = "under";
    else status = "on_track";

    return {
      glAccountId: item.glAccountId,
      accountCode: item.glAccount.code,
      accountName: item.glAccount.name,
      budgeted,
      actual,
      variance,
      variancePercent,
      status,
    };
  });
}

export async function getDepartmentKPIs(
  organizationId: string,
  departmentId: string
): Promise<DepartmentKPI> {
  const department = await prisma.department.findUniqueOrThrow({
    where: { id: departmentId },
    include: {
      head: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      budgets: {
        where: { status: { in: ["ACTIVE", "APPROVED"] } },
        include: { lineItems: true },
        take: 1,
        orderBy: { fiscalYear: "desc" },
      },
      members: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      expenses: {
        where: { status: { in: ["APPROVED", "REIMBURSED"] } },
      },
    },
  });

  const budget = department.budgets[0];
  const totalBudget = budget
    ? budget.lineItems.reduce((s, li) => s + Number(li.totalAmount), 0)
    : 0;

  const totalSpent = department.expenses.reduce(
    (s, e) => s + Number(e.amount),
    0
  );

  const headcount = department.members.length;
  const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const costPerEmployee = headcount > 0 ? totalSpent / headcount : 0;

  // Department head name
  const head = department.head
    ? `${department.head.firstName} ${department.head.lastName}`.trim()
    : "Unassigned";

  // Group expenses by category
  const categoryMap = new Map<string, number>();
  for (const exp of department.expenses) {
    const cat = exp.categorySlug || "Uncategorized";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(exp.amount));
  }
  const topCategories = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // Monthly spending trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const monthlySpending = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    monthlySpending.set(label, 0);
  }

  for (const exp of department.expenses) {
    const expDate = new Date(exp.occurredAt || exp.createdAt);
    if (expDate >= sixMonthsAgo) {
      const label = expDate.toLocaleDateString("en-US", { month: "short" });
      if (monthlySpending.has(label)) {
        monthlySpending.set(label, (monthlySpending.get(label) || 0) + Number(exp.amount));
      }
    }
  }

  const spendingTrend = Array.from(monthlySpending.entries()).map(
    ([month, amount]) => ({ month, amount })
  );

  // Members list
  const members = department.members.map((m) => ({
    id: m.id,
    name: `${m.user.firstName} ${m.user.lastName}`.trim(),
    role: m.title || m.role,
    email: m.user.email,
    joinedAt: m.createdAt.toISOString(),
  }));

  return {
    id: departmentId,
    name: department.name,
    head,
    totalBudget,
    totalSpent,
    utilization,
    headcount,
    costPerEmployee,
    topCategories,
    spendingTrend,
    members,
  };
}
