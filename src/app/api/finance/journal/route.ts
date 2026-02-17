import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";
import { createJournalEntry } from "@/lib/finance/gl-engine";

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

    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    const where: Record<string, unknown> = { organizationId };

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          lines: {
            include: {
              glAccount: { select: { code: true, name: true } },
            },
          },
          createdBy: { select: { firstName: true, lastName: true } },
          approvedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return NextResponse.json({
      data: data.map((entry) => ({
        ...entry,
        lines: entry.lines.map((line) => ({
          ...line,
          debit: Number(line.debit),
          credit: Number(line.credit),
        })),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Journal entries API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch journal entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePermission("gl", "create");
    if (isAuthError(authResult)) return authResult;

    const body = await request.json();
    const { description, date, periodId, lines } = body;

    const organizationId = await resolveOrganizationId(
      authResult.userId,
      body.organizationId ?? null
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    if (!description || !date || !lines?.length) {
      return NextResponse.json(
        { error: "description, date, and lines are required" },
        { status: 400 }
      );
    }

    const entry = await createJournalEntry({
      organizationId,
      description,
      date: new Date(date),
      createdById: authResult.userId,
      periodId: periodId || null,
      lines,
    });

    return NextResponse.json({
      ...entry,
      lines: entry.lines.map((line) => ({
        ...line,
        debit: Number(line.debit),
        credit: Number(line.credit),
      })),
    }, { status: 201 });
  } catch (error) {
    console.error("Create journal entry error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create journal entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
