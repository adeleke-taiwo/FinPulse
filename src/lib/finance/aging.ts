import { prisma } from "@/lib/db";

export interface AgingBucket {
  label: string;
  count: number;
  totalAmount: number;
  invoices: {
    id: string;
    invoiceNumber: string;
    vendorOrCustomer: string;
    amount: number;
    dueDate: string;
    daysOverdue: number;
  }[];
}

export interface AgingReport {
  current: AgingBucket;
  thirtyDays: AgingBucket;
  sixtyDays: AgingBucket;
  ninetyDays: AgingBucket;
  overNinety: AgingBucket;
  totalOutstanding: number;
}

function categorizeByAge(
  daysOverdue: number
): "current" | "thirtyDays" | "sixtyDays" | "ninetyDays" | "overNinety" {
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "thirtyDays";
  if (daysOverdue <= 60) return "sixtyDays";
  if (daysOverdue <= 90) return "ninetyDays";
  return "overNinety";
}

export async function getAPAgingReport(organizationId: string): Promise<AgingReport> {
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      status: { in: ["RECEIVED", "PENDING_APPROVAL", "APPROVED", "PARTIALLY_PAID", "OVERDUE"] },
    },
    include: {
      vendor: { select: { name: true } },
      payments: { select: { amount: true } },
    },
  });

  const now = new Date();
  const report: AgingReport = {
    current: { label: "Current", count: 0, totalAmount: 0, invoices: [] },
    thirtyDays: { label: "1-30 Days", count: 0, totalAmount: 0, invoices: [] },
    sixtyDays: { label: "31-60 Days", count: 0, totalAmount: 0, invoices: [] },
    ninetyDays: { label: "61-90 Days", count: 0, totalAmount: 0, invoices: [] },
    overNinety: { label: "90+ Days", count: 0, totalAmount: 0, invoices: [] },
    totalOutstanding: 0,
  };

  for (const inv of invoices) {
    const paidAmount = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    const outstanding = Number(inv.totalAmount) - paidAmount;
    if (outstanding <= 0) continue;

    const daysOverdue = Math.floor(
      (now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const bucket = categorizeByAge(daysOverdue);
    report[bucket].count++;
    report[bucket].totalAmount += outstanding;
    report[bucket].invoices.push({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      vendorOrCustomer: inv.vendor.name,
      amount: outstanding,
      dueDate: inv.dueDate.toISOString().slice(0, 10),
      daysOverdue: Math.max(0, daysOverdue),
    });
    report.totalOutstanding += outstanding;
  }

  return report;
}

export async function getARAgingReport(organizationId: string): Promise<AgingReport> {
  const invoices = await prisma.customerInvoice.findMany({
    where: {
      organizationId,
      status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
    },
    include: {
      customer: { select: { name: true } },
      payments: { select: { amount: true } },
    },
  });

  const now = new Date();
  const report: AgingReport = {
    current: { label: "Current", count: 0, totalAmount: 0, invoices: [] },
    thirtyDays: { label: "1-30 Days", count: 0, totalAmount: 0, invoices: [] },
    sixtyDays: { label: "31-60 Days", count: 0, totalAmount: 0, invoices: [] },
    ninetyDays: { label: "61-90 Days", count: 0, totalAmount: 0, invoices: [] },
    overNinety: { label: "90+ Days", count: 0, totalAmount: 0, invoices: [] },
    totalOutstanding: 0,
  };

  for (const inv of invoices) {
    const paidAmount = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    const outstanding = Number(inv.totalAmount) - paidAmount;
    if (outstanding <= 0) continue;

    const daysOverdue = Math.floor(
      (now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const bucket = categorizeByAge(daysOverdue);
    report[bucket].count++;
    report[bucket].totalAmount += outstanding;
    report[bucket].invoices.push({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      vendorOrCustomer: inv.customer.name,
      amount: outstanding,
      dueDate: inv.dueDate.toISOString().slice(0, 10),
      daysOverdue: Math.max(0, daysOverdue),
    });
    report.totalOutstanding += outstanding;
  }

  return report;
}
