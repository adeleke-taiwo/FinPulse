import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";

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
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          vendor: { select: { name: true, code: true } },
          payments: { select: { amount: true, paidAt: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      data: data.map((inv) => ({
        ...inv,
        vendorName: inv.vendor?.name || "-",
        amount: Number(inv.amount),
        taxAmount: Number(inv.taxAmount),
        totalAmount: Number(inv.totalAmount),
        paidAmount: inv.payments.reduce((s, p) => s + Number(p.amount), 0),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Invoices API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePermission("ap", "create");
    if (isAuthError(authResult)) return authResult;

    const body = await request.json();
    const {
      vendorId,
      invoiceNumber,
      amount,
      taxAmount,
      totalAmount,
      dueDate,
      lineItems,
    } = body;

    const organizationId = await resolveOrganizationId(
      authResult.userId,
      body.organizationId ?? null
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    if (!vendorId || !invoiceNumber || !amount || !totalAmount || !dueDate) {
      return NextResponse.json(
        { error: "vendorId, invoiceNumber, amount, totalAmount, and dueDate are required" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.create({
      data: {
        organizationId,
        vendorId,
        invoiceNumber,
        amount,
        taxAmount: taxAmount || 0,
        totalAmount,
        dueDate: new Date(dueDate),
        lineItems: lineItems || null,
      },
      include: {
        vendor: { select: { name: true, code: true } },
      },
    });

    return NextResponse.json({
      ...invoice,
      amount: Number(invoice.amount),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
    }, { status: 201 });
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
