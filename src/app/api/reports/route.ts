import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { resolveOrganizationId } from "@/lib/auth/resolve-org";

const BUILT_IN_TEMPLATES = [
  {
    id: "rpt-financial-summary",
    name: "Financial Summary",
    description: "High-level overview of revenue, expenses, and profit margins",
    category: "financial",
  },
  {
    id: "rpt-department-spending",
    name: "Department Spending",
    description: "Breakdown of expenses by department with budget comparisons",
    category: "operational",
  },
  {
    id: "rpt-ap-aging",
    name: "AP Aging",
    description: "Accounts payable aging report grouped by 30/60/90/120+ day buckets",
    category: "financial",
  },
  {
    id: "rpt-ar-aging",
    name: "AR Aging",
    description: "Accounts receivable aging report with customer breakdown",
    category: "financial",
  },
  {
    id: "rpt-budget-variance",
    name: "Budget Variance",
    description: "Comparison of budgeted vs actual spending across GL accounts",
    category: "financial",
  },
  {
    id: "rpt-expense-report",
    name: "Expense Report",
    description: "Employee expense submissions with approval status and category analysis",
    category: "operational",
  },
];

/**
 * GET /api/reports
 * List built-in templates + saved custom reports.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category");
    const organizationId = await resolveOrganizationId(
      session.user.id,
      searchParams.get("organizationId")
    );

    let templates = BUILT_IN_TEMPLATES;
    if (category) {
      templates = templates.filter((r) => r.category === category);
    }

    // Fetch saved custom reports
    let savedReports: {
      id: string;
      name: string;
      description: string | null;
      category: string;
      filters: unknown;
      createdAt: Date;
      createdBy: { firstName: string; lastName: string };
    }[] = [];

    if (organizationId) {
      savedReports = await prisma.report.findMany({
        where: {
          organizationId,
          ...(category ? { category } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
        },
      });
    }

    return NextResponse.json({
      data: templates,
      savedReports: savedReports.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        category: r.category,
        filters: r.filters,
        createdAt: r.createdAt,
        createdBy: `${r.createdBy.firstName} ${r.createdBy.lastName}`.trim(),
      })),
      total: templates.length + savedReports.length,
    });
  } catch (error) {
    console.error("Reports GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reports
 * Save a custom report configuration.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, category, filters } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Report name is required" },
        { status: 400 }
      );
    }

    const organizationId = await resolveOrganizationId(
      session.user.id,
      body.organizationId ?? null
    );
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        organizationId,
        createdById: session.user.id,
        name,
        description: description || null,
        category: category || "custom",
        filters: filters || {},
      },
    });

    return NextResponse.json(
      {
        data: {
          id: report.id,
          name: report.name,
          description: report.description,
          category: report.category,
          createdAt: report.createdAt,
        },
        message: "Report saved successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Reports POST error:", error);
    return NextResponse.json(
      { error: "Failed to save report" },
      { status: 500 }
    );
  }
}
