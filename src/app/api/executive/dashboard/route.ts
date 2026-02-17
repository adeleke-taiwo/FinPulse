import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";

/**
 * GET /api/executive/dashboard
 * Consolidated executive dashboard data.
 * Returns revenue, expenses, cash position, AP/AR outstanding,
 * recent journal entries, and monthly P&L for the last 6 months.
 * Uses raw SQL queries for performance.
 *
 * NOTE: Prisma only maps table names via @@map (e.g. "journal_lines").
 * Individual column names remain camelCase and must be quoted in raw SQL.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const organizationId = await resolveOrganizationId(
      session.user.id,
      searchParams.get("organizationId")
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Run all queries in parallel for performance
    const [
      revenueResult,
      expenseResult,
      cashPositionResult,
      apOutstandingResult,
      arOutstandingResult,
      recentJournalEntries,
      monthlyPnLResult,
    ] = await Promise.all([
      // Recent revenue: sum of REVENUE GL accounts from posted journal entries
      prisma.$queryRawUnsafe<{ total: number }[]>(
        `SELECT COALESCE(SUM(jl.credit - jl.debit), 0)::float AS total
         FROM journal_lines jl
         JOIN gl_accounts ga ON jl."glAccountId" = ga.id
         JOIN journal_entries je ON jl."journalEntryId" = je.id
         WHERE ga."organizationId" = $1
           AND ga.classification = 'REVENUE'
           AND je.status = 'POSTED'`,
        organizationId
      ),

      // Recent expenses: sum of EXPENSE GL accounts from posted journal entries
      prisma.$queryRawUnsafe<{ total: number }[]>(
        `SELECT COALESCE(SUM(jl.debit - jl.credit), 0)::float AS total
         FROM journal_lines jl
         JOIN gl_accounts ga ON jl."glAccountId" = ga.id
         JOIN journal_entries je ON jl."journalEntryId" = je.id
         WHERE ga."organizationId" = $1
           AND ga.classification = 'EXPENSE'
           AND je.status = 'POSTED'`,
        organizationId
      ),

      // Cash position: sum of cash GL accounts (codes 1010-1030)
      prisma.$queryRawUnsafe<{ total: number }[]>(
        `SELECT COALESCE(SUM(jl.debit - jl.credit), 0)::float AS total
         FROM journal_lines jl
         JOIN gl_accounts ga ON jl."glAccountId" = ga.id
         JOIN journal_entries je ON jl."journalEntryId" = je.id
         WHERE ga."organizationId" = $1
           AND ga.code >= '1010' AND ga.code <= '1030'
           AND je.status = 'POSTED'`,
        organizationId
      ),

      // AP outstanding: count, sum, overdue, and due this week
      prisma.$queryRawUnsafe<{ count: number; total: number; overdue: number; due_this_week: number }[]>(
        `SELECT COUNT(*)::int AS count,
                COALESCE(SUM("totalAmount"), 0)::float AS total,
                COALESCE(SUM(CASE WHEN "dueDate" < NOW() THEN "totalAmount" ELSE 0 END), 0)::float AS overdue,
                COALESCE(SUM(CASE WHEN "dueDate" >= NOW() AND "dueDate" <= NOW() + INTERVAL '7 days' THEN "totalAmount" ELSE 0 END), 0)::float AS due_this_week
         FROM invoices
         WHERE "organizationId" = $1
           AND status NOT IN ('PAID', 'VOID')`,
        organizationId
      ),

      // AR outstanding: count, sum, overdue, and due this week
      prisma.$queryRawUnsafe<{ count: number; total: number; overdue: number; due_this_week: number }[]>(
        `SELECT COUNT(*)::int AS count,
                COALESCE(SUM("totalAmount"), 0)::float AS total,
                COALESCE(SUM(CASE WHEN "dueDate" < NOW() THEN "totalAmount" ELSE 0 END), 0)::float AS overdue,
                COALESCE(SUM(CASE WHEN "dueDate" >= NOW() AND "dueDate" <= NOW() + INTERVAL '7 days' THEN "totalAmount" ELSE 0 END), 0)::float AS due_this_week
         FROM customer_invoices
         WHERE "organizationId" = $1
           AND status NOT IN ('PAID', 'VOID')`,
        organizationId
      ),

      // Recent journal entries: last 5 posted
      prisma.journalEntry.findMany({
        where: {
          organizationId,
          status: "POSTED",
        },
        orderBy: { postedAt: "desc" },
        take: 5,
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          lines: {
            include: {
              glAccount: { select: { code: true, name: true } },
            },
          },
        },
      }),

      // Monthly P&L: last 6 months revenue vs expenses from GL
      prisma.$queryRawUnsafe<
        { month: string; revenue: number; expenses: number }[]
      >(
        `SELECT
           TO_CHAR(je.date, 'YYYY-MM') AS month,
           COALESCE(SUM(CASE WHEN ga.classification = 'REVENUE'
             THEN jl.credit - jl.debit ELSE 0 END), 0)::float AS revenue,
           COALESCE(SUM(CASE WHEN ga.classification = 'EXPENSE'
             THEN jl.debit - jl.credit ELSE 0 END), 0)::float AS expenses
         FROM journal_lines jl
         JOIN gl_accounts ga ON jl."glAccountId" = ga.id
         JOIN journal_entries je ON jl."journalEntryId" = je.id
         WHERE ga."organizationId" = $1
           AND je.status = 'POSTED'
           AND je.date >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
         GROUP BY TO_CHAR(je.date, 'YYYY-MM')
         ORDER BY month ASC`,
        organizationId
      ),
    ]);

    return NextResponse.json({
      data: {
        recentRevenue: revenueResult[0]?.total ?? 0,
        recentExpenses: expenseResult[0]?.total ?? 0,
        cashPosition: cashPositionResult[0]?.total ?? 0,
        apOutstanding: {
          count: apOutstandingResult[0]?.count ?? 0,
          total: apOutstandingResult[0]?.total ?? 0,
        },
        arOutstanding: {
          count: arOutstandingResult[0]?.count ?? 0,
          total: arOutstandingResult[0]?.total ?? 0,
        },
        apSummary: {
          totalOutstanding: apOutstandingResult[0]?.total ?? 0,
          overdue: apOutstandingResult[0]?.overdue ?? 0,
          dueThisWeek: apOutstandingResult[0]?.due_this_week ?? 0,
        },
        arSummary: {
          totalOutstanding: arOutstandingResult[0]?.total ?? 0,
          overdue: arOutstandingResult[0]?.overdue ?? 0,
          dueThisWeek: arOutstandingResult[0]?.due_this_week ?? 0,
        },
        recentJournalEntries: recentJournalEntries.map((je) => ({
          id: je.id,
          entryNumber: je.entryNumber,
          description: je.description,
          date: je.date,
          status: je.status,
          postedAt: je.postedAt,
          createdBy: je.createdBy,
          lines: je.lines.map((line) => ({
            glAccount: line.glAccount,
            debit: Number(line.debit),
            credit: Number(line.credit),
            description: line.description,
          })),
        })),
        monthlyPnL: monthlyPnLResult.map((row) => ({
          month: row.month,
          revenue: row.revenue,
          expenses: row.expenses,
          netIncome: row.revenue - row.expenses,
        })),
      },
    });
  } catch (error) {
    console.error("Executive dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch executive dashboard data" },
      { status: 500 }
    );
  }
}
