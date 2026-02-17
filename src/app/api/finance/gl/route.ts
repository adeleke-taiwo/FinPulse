import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";

interface AccountWithChildren {
  id: string;
  code: string;
  name: string;
  classification: string;
  normalBalance: string;
  children?: AccountWithChildren[];
  [key: string]: unknown;
}

function attachBalances(
  accounts: AccountWithChildren[],
  balanceMap: Map<string, number>
): (AccountWithChildren & { balance: number })[] {
  return accounts.map((acct) => {
    const children = acct.children
      ? attachBalances(acct.children, balanceMap)
      : undefined;
    const ownBalance = balanceMap.get(acct.id) || 0;
    const childrenTotal = children
      ? children.reduce((sum, c) => sum + c.balance, 0)
      : 0;
    return {
      ...acct,
      balance: ownBalance + childrenTotal,
      ...(children ? { children } : {}),
    };
  });
}

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

    const classification = searchParams.get("classification");
    const accountId = searchParams.get("accountId");

    // Single account detail mode — return account + journal lines
    if (accountId) {
      const account = await prisma.gLAccount.findFirst({
        where: { id: accountId, organizationId, isActive: true },
      });
      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      // Compute balance
      const [balRow] = await prisma.$queryRawUnsafe<
        { debit_total: number; credit_total: number }[]
      >(
        `SELECT
          COALESCE(SUM(jl.debit), 0)::float AS debit_total,
          COALESCE(SUM(jl.credit), 0)::float AS credit_total
        FROM journal_lines jl
        JOIN journal_entries je ON je.id = jl."journalEntryId" AND je.status = 'POSTED'
        WHERE jl."glAccountId" = $1`,
        accountId
      );

      const balance = account.normalBalance === "DEBIT"
        ? (balRow?.debit_total || 0) - (balRow?.credit_total || 0)
        : (balRow?.credit_total || 0) - (balRow?.debit_total || 0);

      // Fetch journal lines for this account
      const lines = await prisma.$queryRawUnsafe<
        { id: string; journalEntryId: string; entryNumber: string; description: string; date: string; debit: number; credit: number; status: string }[]
      >(
        `SELECT
          jl.id,
          jl."journalEntryId",
          je."entryNumber",
          COALESCE(jl.description, je.description) AS description,
          je.date::text AS date,
          jl.debit::float AS debit,
          jl.credit::float AS credit,
          je.status
        FROM journal_lines jl
        JOIN journal_entries je ON je.id = jl."journalEntryId"
        WHERE jl."glAccountId" = $1
        ORDER BY je.date ASC, je."entryNumber" ASC`,
        accountId
      );

      return NextResponse.json({
        account: { ...account, balance },
        lines,
      });
    }

    // List mode — return tree with balances
    const where: Record<string, unknown> = {
      organizationId,
      isActive: true,
    };

    if (classification) {
      where.classification = classification;
    }

    const accounts = await prisma.gLAccount.findMany({
      where: {
        ...where,
        parentId: null,
      },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: {
              where: { isActive: true },
              orderBy: { code: "asc" },
            },
          },
          orderBy: { code: "asc" },
        },
      },
      orderBy: { code: "asc" },
    });

    // Compute balances from posted journal entry lines
    const balanceRows = await prisma.$queryRawUnsafe<
      { id: string; normal_balance: string; debit_total: number; credit_total: number }[]
    >(
      `SELECT
        ga.id,
        ga."normalBalance" AS normal_balance,
        COALESCE(SUM(jl.debit), 0)::float AS debit_total,
        COALESCE(SUM(jl.credit), 0)::float AS credit_total
      FROM gl_accounts ga
      LEFT JOIN journal_lines jl ON jl."glAccountId" = ga.id
      LEFT JOIN journal_entries je ON je.id = jl."journalEntryId" AND je.status = 'POSTED'
      WHERE ga."organizationId" = $1 AND ga."isActive" = true
      GROUP BY ga.id, ga."normalBalance"`,
      organizationId
    );

    const balanceMap = new Map<string, number>();
    for (const row of balanceRows) {
      const bal = row.normal_balance === "DEBIT"
        ? row.debit_total - row.credit_total
        : row.credit_total - row.debit_total;
      balanceMap.set(row.id, bal);
    }

    const data = attachBalances(accounts as AccountWithChildren[], balanceMap);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GL accounts API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GL accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePermission("gl", "create");
    if (isAuthError(authResult)) return authResult;

    const body = await request.json();
    const {
      code,
      name,
      classification,
      normalBalance,
      parentId,
      description,
    } = body;

    const organizationId = await resolveOrganizationId(
      authResult.userId,
      body.organizationId ?? null
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    if (!code || !name || !classification) {
      return NextResponse.json(
        { error: "code, name, and classification are required" },
        { status: 400 }
      );
    }

    const validClassifications = [
      "ASSET",
      "LIABILITY",
      "EQUITY",
      "REVENUE",
      "EXPENSE",
    ];
    if (!validClassifications.includes(classification)) {
      return NextResponse.json(
        { error: `classification must be one of: ${validClassifications.join(", ")}` },
        { status: 400 }
      );
    }

    const account = await prisma.gLAccount.create({
      data: {
        organizationId,
        code,
        name,
        classification,
        normalBalance: normalBalance || "DEBIT",
        parentId: parentId || null,
        description: description || null,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Create GL account error:", error);
    return NextResponse.json(
      { error: "Failed to create GL account" },
      { status: 500 }
    );
  }
}
