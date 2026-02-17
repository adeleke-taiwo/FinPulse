import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
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
      prisma.customerInvoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { name: true, code: true } },
          payments: { select: { amount: true, paidAt: true } },
        },
      }),
      prisma.customerInvoice.count({ where }),
    ]);

    return NextResponse.json({
      data: data.map((inv) => ({
        ...inv,
        customerName: inv.customer?.name || "-",
        amount: Number(inv.totalAmount),
        totalAmount: Number(inv.totalAmount),
        paidAmount: inv.payments.reduce((s, p) => s + Number(p.amount), 0),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Customer invoices API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerId,
      invoiceNumber,
      totalAmount,
      dueDate,
      lineItems,
    } = body;

    const organizationId = await resolveOrganizationId(
      session.user.id,
      body.organizationId ?? null
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    if (!customerId || !invoiceNumber || !totalAmount || !dueDate) {
      return NextResponse.json(
        { error: "customerId, invoiceNumber, totalAmount, and dueDate are required" },
        { status: 400 }
      );
    }

    const invoice = await prisma.customerInvoice.create({
      data: {
        organizationId,
        customerId,
        invoiceNumber,
        totalAmount,
        dueDate: new Date(dueDate),
        lineItems: lineItems || null,
      },
      include: {
        customer: { select: { name: true, code: true } },
      },
    });

    return NextResponse.json({
      ...invoice,
      totalAmount: Number(invoice.totalAmount),
    }, { status: 201 });
  } catch (error) {
    console.error("Create customer invoice error:", error);
    return NextResponse.json(
      { error: "Failed to create customer invoice" },
      { status: 500 }
    );
  }
}
