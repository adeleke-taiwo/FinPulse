import { prisma } from "@/lib/db";
import type { AccountClassification } from "@prisma/client";

interface JournalLineInput {
  glAccountId: string;
  costCenterId?: string | null;
  description?: string | null;
  debit: number;
  credit: number;
}

interface CreateJournalEntryInput {
  organizationId: string;
  description: string;
  date: Date;
  createdById: string;
  periodId?: string | null;
  lines: JournalLineInput[];
}

export function validateDoubleEntry(lines: JournalLineInput[]): {
  valid: boolean;
  totalDebits: number;
  totalCredits: number;
  error?: string;
} {
  if (lines.length < 2) {
    return { valid: false, totalDebits: 0, totalCredits: 0, error: "At least 2 lines required" };
  }

  const totalDebits = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredits = lines.reduce((sum, l) => sum + l.credit, 0);

  // Allow for floating point tolerance
  const diff = Math.abs(totalDebits - totalCredits);
  if (diff > 0.01) {
    return {
      valid: false,
      totalDebits,
      totalCredits,
      error: `Debits ($${totalDebits.toFixed(2)}) must equal credits ($${totalCredits.toFixed(2)})`,
    };
  }

  // Each line must have either debit or credit, not both
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].debit > 0 && lines[i].credit > 0) {
      return { valid: false, totalDebits, totalCredits, error: `Line ${i + 1}: cannot have both debit and credit` };
    }
    if (lines[i].debit === 0 && lines[i].credit === 0) {
      return { valid: false, totalDebits, totalCredits, error: `Line ${i + 1}: must have a debit or credit amount` };
    }
  }

  return { valid: true, totalDebits, totalCredits };
}

export async function generateEntryNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.journalEntry.count({
    where: {
      organizationId,
      entryNumber: { startsWith: `JE-${year}` },
    },
  });
  return `JE-${year}-${String(count + 1).padStart(6, "0")}`;
}

export async function createJournalEntry(input: CreateJournalEntryInput) {
  const validation = validateDoubleEntry(input.lines);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const entryNumber = await generateEntryNumber(input.organizationId);

  return prisma.journalEntry.create({
    data: {
      organizationId: input.organizationId,
      entryNumber,
      description: input.description,
      date: input.date,
      status: "DRAFT",
      createdById: input.createdById,
      periodId: input.periodId,
      lines: {
        create: input.lines.map((line) => ({
          glAccountId: line.glAccountId,
          costCenterId: line.costCenterId,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
        })),
      },
    },
    include: { lines: { include: { glAccount: true } } },
  });
}

export async function approveJournalEntry(entryId: string, approvedById: string) {
  return prisma.journalEntry.update({
    where: { id: entryId },
    data: { status: "APPROVED", approvedById },
  });
}

export async function postJournalEntry(entryId: string) {
  return prisma.journalEntry.update({
    where: { id: entryId },
    data: { status: "POSTED", postedAt: new Date() },
  });
}

export async function reverseJournalEntry(
  entryId: string,
  createdById: string
) {
  const original = await prisma.journalEntry.findUniqueOrThrow({
    where: { id: entryId },
    include: { lines: true },
  });

  if (original.status !== "POSTED") {
    throw new Error("Only posted entries can be reversed");
  }

  const entryNumber = await generateEntryNumber(original.organizationId);

  return prisma.journalEntry.create({
    data: {
      organizationId: original.organizationId,
      entryNumber,
      description: `Reversal of ${original.entryNumber}: ${original.description}`,
      date: new Date(),
      status: "POSTED",
      createdById,
      postedAt: new Date(),
      reversalOfId: entryId,
      periodId: original.periodId,
      lines: {
        create: original.lines.map((line) => ({
          glAccountId: line.glAccountId,
          costCenterId: line.costCenterId,
          description: `Reversal: ${line.description || ""}`,
          debit: Number(line.credit),
          credit: Number(line.debit),
        })),
      },
    },
    include: { lines: true },
  });
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  classification: AccountClassification;
  debitBalance: number;
  creditBalance: number;
}

export async function getTrialBalance(
  organizationId: string,
  asOfDate?: Date
): Promise<TrialBalanceRow[]> {
  if (asOfDate) {
    const rows = await prisma.$queryRawUnsafe<TrialBalanceRow[]>(`
      SELECT
        ga.id AS "accountId",
        ga.code AS "accountCode",
        ga.name AS "accountName",
        ga.classification,
        COALESCE(SUM(jl.debit), 0)::float AS "debitBalance",
        COALESCE(SUM(jl.credit), 0)::float AS "creditBalance"
      FROM gl_accounts ga
      LEFT JOIN journal_lines jl ON jl."glAccountId" = ga.id
      LEFT JOIN journal_entries je ON je.id = jl."journalEntryId"
        AND je.status = 'POSTED'
        AND je."date" <= $2
      WHERE ga."organizationId" = $1
        AND ga."isActive" = true
      GROUP BY ga.id, ga.code, ga.name, ga.classification
      ORDER BY ga.code
    `, organizationId, asOfDate.toISOString());
    return rows;
  }

  const rows = await prisma.$queryRawUnsafe<TrialBalanceRow[]>(`
    SELECT
      ga.id AS "accountId",
      ga.code AS "accountCode",
      ga.name AS "accountName",
      ga.classification,
      COALESCE(SUM(jl.debit), 0)::float AS "debitBalance",
      COALESCE(SUM(jl.credit), 0)::float AS "creditBalance"
    FROM gl_accounts ga
    LEFT JOIN journal_lines jl ON jl."glAccountId" = ga.id
    LEFT JOIN journal_entries je ON je.id = jl."journalEntryId"
      AND je.status = 'POSTED'
    WHERE ga."organizationId" = $1
      AND ga."isActive" = true
    GROUP BY ga.id, ga.code, ga.name, ga.classification
    ORDER BY ga.code
  `, organizationId);
  return rows;
}

export async function getAccountBalance(
  accountId: string,
  asOfDate?: Date
): Promise<number> {
  let results: { debit_total: number; credit_total: number; normal_balance: string }[];

  if (asOfDate) {
    results = await prisma.$queryRawUnsafe<
      { debit_total: number; credit_total: number; normal_balance: string }[]
    >(`
      SELECT
        COALESCE(SUM(jl.debit), 0)::float AS debit_total,
        COALESCE(SUM(jl.credit), 0)::float AS credit_total,
        ga."normalBalance" AS normal_balance
      FROM gl_accounts ga
      LEFT JOIN journal_lines jl ON jl."glAccountId" = ga.id
      LEFT JOIN journal_entries je ON je.id = jl."journalEntryId"
        AND je.status = 'POSTED'
        AND je."date" <= $2
      WHERE ga.id = $1
      GROUP BY ga.id, ga."normalBalance"
    `, accountId, asOfDate.toISOString());
  } else {
    results = await prisma.$queryRawUnsafe<
      { debit_total: number; credit_total: number; normal_balance: string }[]
    >(`
      SELECT
        COALESCE(SUM(jl.debit), 0)::float AS debit_total,
        COALESCE(SUM(jl.credit), 0)::float AS credit_total,
        ga."normalBalance" AS normal_balance
      FROM gl_accounts ga
      LEFT JOIN journal_lines jl ON jl."glAccountId" = ga.id
      LEFT JOIN journal_entries je ON je.id = jl."journalEntryId"
        AND je.status = 'POSTED'
      WHERE ga.id = $1
      GROUP BY ga.id, ga."normalBalance"
    `, accountId);
  }

  const result = results[0];
  if (!result) return 0;

  return result.normal_balance === "DEBIT"
    ? result.debit_total - result.credit_total
    : result.credit_total - result.debit_total;
}
