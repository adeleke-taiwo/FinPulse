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
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const where = { organizationId, isActive: true };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { customerInvoices: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      data: customers.map((c) => ({
        ...c,
        creditLimit: c.creditLimit != null ? Number(c.creditLimit) : null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Customers API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePermission("ar", "create");
    if (isAuthError(authResult)) return authResult;

    const body = await request.json();
    const {
      name,
      code,
      email,
      creditLimit,
      paymentTerms,
    } = body;

    const organizationId = await resolveOrganizationId(
      authResult.userId,
      body.organizationId ?? null
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    if (!name || !code) {
      return NextResponse.json(
        { error: "name and code are required" },
        { status: 400 }
      );
    }

    // Convert string payment terms (e.g. "NET_30") to integer days
    let paymentTermsDays = 30;
    if (typeof paymentTerms === "number") {
      paymentTermsDays = paymentTerms;
    } else if (typeof paymentTerms === "string") {
      if (paymentTerms === "DUE_ON_RECEIPT") {
        paymentTermsDays = 0;
      } else {
        const match = paymentTerms.match(/(\d+)/);
        paymentTermsDays = match ? parseInt(match[1], 10) : 30;
      }
    }

    const customer = await prisma.customer.create({
      data: {
        organizationId,
        name,
        code,
        email: email || null,
        creditLimit: creditLimit ?? null,
        paymentTerms: paymentTermsDays,
      },
    });

    return NextResponse.json({
      ...customer,
      creditLimit: customer.creditLimit != null ? Number(customer.creditLimit) : null,
    }, { status: 201 });
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
