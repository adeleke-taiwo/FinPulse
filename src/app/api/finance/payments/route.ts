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

    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    const where = { organizationId };

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { paidAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              vendor: { select: { name: true } },
            },
          },
          customerInvoice: {
            select: {
              invoiceNumber: true,
              customer: { select: { name: true } },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      data: data.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Payments API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
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
      invoiceId,
      customerInvoiceId,
      amount,
      method,
      reference,
    } = body;

    const organizationId = await resolveOrganizationId(
      authResult.userId,
      body.organizationId ?? null
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    if (!amount) {
      return NextResponse.json(
        { error: "amount is required" },
        { status: 400 }
      );
    }

    if (!invoiceId && !customerInvoiceId) {
      return NextResponse.json(
        { error: "Either invoiceId or customerInvoiceId is required" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        organizationId,
        invoiceId: invoiceId || null,
        customerInvoiceId: customerInvoiceId || null,
        amount,
        method: method || "bank_transfer",
        reference: reference || null,
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            vendor: { select: { name: true } },
          },
        },
        customerInvoice: {
          select: {
            invoiceNumber: true,
            customer: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      ...payment,
      amount: Number(payment.amount),
    }, { status: 201 });
  } catch (error) {
    console.error("Record payment error:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}
