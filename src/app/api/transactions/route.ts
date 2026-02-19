import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requirePermission("transactions", "view");
    if (isAuthError(authResult)) return authResult;
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const minAmount = searchParams.get("minAmount");
    const maxAmount = searchParams.get("maxAmount");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const categoryId = searchParams.get("categoryId");
    const sortBy = searchParams.get("sortBy") || "occurredAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    const search = searchParams.get("search");

    const where: Prisma.TransactionWhereInput = {};

    if (type) where.type = type as Prisma.EnumTransactionTypeFilter;
    if (status) where.status = status as Prisma.EnumTransactionStatusFilter;
    if (categoryId) where.categoryId = categoryId;
    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = parseFloat(minAmount);
      if (maxAmount) where.amount.lte = parseFloat(maxAmount);
    }
    if (from || to) {
      where.occurredAt = {};
      if (from) where.occurredAt.gte = new Date(from);
      if (to) where.occurredAt.lte = new Date(to);
    }
    if (search) {
      where.description = { contains: search, mode: "insensitive" };
    }

    const orderBy: Prisma.TransactionOrderByWithRelationInput = {};
    const validSortFields = ["occurredAt", "amount", "type", "status", "createdAt"];
    if (validSortFields.includes(sortBy)) {
      (orderBy as Record<string, string>)[sortBy] = sortOrder;
    } else {
      orderBy.occurredAt = "desc";
    }

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: { select: { name: true, color: true, icon: true } },
          fromAccount: { select: { accountNumber: true, type: true, user: { select: { firstName: true, lastName: true } } } },
          toAccount: { select: { accountNumber: true, type: true } },
          riskFlags: { select: { severity: true, status: true, riskScore: true, ruleTriggered: true } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({
      data: data.map((tx) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount: Number(tx.amount),
        description: tx.description,
        occurredAt: tx.occurredAt,
        category: tx.category,
        fromAccount: tx.fromAccount,
        toAccount: tx.toAccount,
        riskFlags: tx.riskFlags.map((rf) => ({
          severity: rf.severity,
          status: rf.status,
          riskScore: Number(rf.riskScore),
          ruleTriggered: rf.ruleTriggered,
        })),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Transactions API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePermission("transactions", "create");
    if (isAuthError(authResult)) return authResult;

    const body = await request.json();
    const { fromAccountId, toAccountId, categoryId, type, amount, description, metadata } = body;

    const transaction = await prisma.transaction.create({
      data: {
        fromAccountId,
        toAccountId,
        categoryId,
        type,
        amount,
        description,
        metadata,
        status: "COMPLETED",
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: authResult.userId,
        action: "transaction.create",
        resource: "transaction",
        resourceId: transaction.id,
        details: { amount, type },
      },
    });

    return NextResponse.json({
      ...transaction,
      amount: Number(transaction.amount),
    }, { status: 201 });
  } catch (error) {
    console.error("Create transaction error:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
