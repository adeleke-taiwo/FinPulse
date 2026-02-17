import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requirePermission("risk", "view");
    if (isAuthError(authResult)) return authResult;
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.riskFlag.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          transaction: {
            select: {
              id: true,
              amount: true,
              type: true,
              occurredAt: true,
              fromAccount: { select: { accountNumber: true } },
            },
          },
        },
      }),
      prisma.riskFlag.count({ where }),
    ]);

    // Severity distribution
    const distribution = await prisma.riskFlag.groupBy({
      by: ["severity"],
      _count: true,
    });

    // Trend (flags per month)
    const trend = await prisma.$queryRawUnsafe<
      { month: string; count: number }[]
    >(
      `SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') AS month, COUNT(*)::int AS count
       FROM risk_flags GROUP BY DATE_TRUNC('month', "createdAt") ORDER BY month`
    );

    return NextResponse.json({
      data: data.map((rf) => ({
        ...rf,
        riskScore: Number(rf.riskScore),
        transaction: {
          ...rf.transaction,
          amount: Number(rf.transaction.amount),
        },
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      distribution: distribution.map((d) => ({
        severity: d.severity,
        count: d._count,
      })),
      trend,
    });
  } catch (error) {
    console.error("Risk API error:", error);
    return NextResponse.json({ error: "Failed to fetch risk data" }, { status: 500 });
  }
}
