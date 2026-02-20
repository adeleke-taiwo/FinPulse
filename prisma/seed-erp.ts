import { Prisma, PrismaClient, OrgRole, AccountClassification, NormalBalance, JournalStatus, ExpenseStatus, InvoiceStatus, CustomerInvoiceStatus, BudgetStatus, WorkflowType, WorkflowStatus, WorkflowStepStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { v4 as uuid } from "uuid";

const prisma = new PrismaClient();

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function randInt(min: number, max: number) { return Math.floor(rand(min, max + 1)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

// ── Predictable IDs for seeding ──
const ORG1_ID = "org-acme-001";
const ORG2_ID = "org-globex-002";

// Demo user IDs
const ADMIN_ID = "usr-admin-001";
const CFO_ID = "usr-cfo-001";
const FM_ID = "usr-fm-001";
const DH_ID = "usr-dh-001";
const EMP_ID = "usr-emp-001";
const AUDITOR_ID = "usr-auditor-001";

async function main() {
  console.log("Seeding FinPulse ERP data...\n");

  // ── Cleanup ERP tables ──
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE budget_line_items, budgets, payments, customer_invoices, invoices, customers, vendors,
    workflow_step_actions, workflow_instances, workflow_template_steps, workflow_templates,
    expenses, journal_lines, journal_entries, fiscal_periods, gl_accounts,
    cost_centers, org_members, custom_roles, departments, subsidiaries, organizations
    CASCADE
  `);
  console.log("  Cleared ERP tables");

  // ── Organizations ──
  const passwordHash = await hash("demo123", 12);
  const adminHash = await hash("admin123", 12);

  await prisma.organization.createMany({
    data: [
      { id: ORG1_ID, name: "Acme Corporation", slug: "acme", primaryColor: "#6366f1" },
      { id: ORG2_ID, name: "Globex Industries", slug: "globex", primaryColor: "#0ea5e9" },
    ],
  });
  console.log("  Created 2 organizations");

  // ── Subsidiaries ──
  const subsidiaries = [
    { id: "sub-acme-us", organizationId: ORG1_ID, name: "Acme US", code: "ACME-US", country: "US", currency: "USD" },
    { id: "sub-acme-uk", organizationId: ORG1_ID, name: "Acme UK", code: "ACME-UK", country: "GB", currency: "GBP" },
    { id: "sub-acme-de", organizationId: ORG1_ID, name: "Acme Germany", code: "ACME-DE", country: "DE", currency: "EUR" },
    { id: "sub-globex-us", organizationId: ORG2_ID, name: "Globex US", code: "GLX-US", country: "US", currency: "USD" },
    { id: "sub-globex-jp", organizationId: ORG2_ID, name: "Globex Japan", code: "GLX-JP", country: "JP", currency: "JPY" },
    { id: "sub-globex-au", organizationId: ORG2_ID, name: "Globex Australia", code: "GLX-AU", country: "AU", currency: "AUD" },
  ];
  await prisma.subsidiary.createMany({ data: subsidiaries });
  console.log("  Created 6 subsidiaries");

  // ── Demo Users (create or ensure exist) ──
  const demoUsers = [
    { id: ADMIN_ID, email: "admin@acme.io", passwordHash: adminHash, firstName: "System", lastName: "Admin", role: "ADMIN" as const },
    { id: CFO_ID, email: "cfo@acme.io", passwordHash, firstName: "Sarah", lastName: "Chen", role: "ANALYST" as const },
    { id: FM_ID, email: "finance@acme.io", passwordHash, firstName: "Michael", lastName: "Torres", role: "ANALYST" as const },
    { id: DH_ID, email: "manager@acme.io", passwordHash, firstName: "Jessica", lastName: "Williams", role: "USER" as const },
    { id: EMP_ID, email: "employee@acme.io", passwordHash, firstName: "David", lastName: "Kim", role: "USER" as const },
    { id: AUDITOR_ID, email: "auditor@acme.io", passwordHash, firstName: "Robert", lastName: "Garcia", role: "ANALYST" as const },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { id: u.id, firstName: u.firstName, lastName: u.lastName },
      create: u,
    });
  }
  console.log("  Created/updated 6 demo users");

  // ── Simulated staff users (for department heads & members) ──
  const staffFirstNames = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn", "Avery", "Cameron", "Dakota", "Emery", "Finley", "Harper", "Jamie", "Kendall", "Logan", "Parker", "Reese", "Sage", "Drew", "Blake", "Hayden", "Micah", "Noel", "Rowan", "Ellis", "Lane", "River", "Skye", "Tatum", "Wren", "Phoenix", "Sasha", "Robin", "Ash", "Devon", "Jules", "Kai", "Lee", "Val"];
  const staffLastNames = ["Anderson", "Brooks", "Campbell", "Davis", "Edwards", "Foster", "Gomez", "Harris", "Ito", "Jackson", "Kelly", "Lee", "Martinez", "Nguyen", "O'Brien", "Patel", "Quinn", "Roberts", "Singh", "Thomas", "Ueda", "Vargas", "Watson", "Xu", "Young", "Zhang"];

  const staffUsers: { id: string; email: string; passwordHash: string; firstName: string; lastName: string; role: "USER" }[] = [];
  for (let i = 0; i < 80; i++) {
    staffUsers.push({
      id: `usr-staff-${String(i + 1).padStart(3, "0")}`,
      email: `staff${i + 1}@acme.io`,
      passwordHash,
      firstName: staffFirstNames[i % staffFirstNames.length],
      lastName: staffLastNames[i % staffLastNames.length],
      role: "USER" as const,
    });
  }
  for (const u of staffUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { id: u.id, firstName: u.firstName, lastName: u.lastName },
      create: u,
    });
  }
  console.log(`  Created ${staffUsers.length} staff users`);

  // ── Departments ──
  const deptNames = ["Engineering", "Sales", "Marketing", "Finance", "HR", "Operations", "Legal", "Support", "Product", "Design", "QA", "Executive"];
  const departments: { id: string; organizationId: string; subsidiaryId: string; name: string; code: string; headUserId: string | null }[] = [];

  // Assign a unique head user to each Acme department
  const acmeHeadIds = [DH_ID, ...staffUsers.slice(0, 11).map((u) => u.id)];

  for (const org of [ORG1_ID, ORG2_ID]) {
    const sub = subsidiaries.find((s) => s.organizationId === org)!;
    for (let i = 0; i < deptNames.length; i++) {
      departments.push({
        id: `dept-${org === ORG1_ID ? "acme" : "globex"}-${deptNames[i].toLowerCase().replace(/\s+/g, "")}`,
        organizationId: org,
        subsidiaryId: sub.id,
        name: deptNames[i],
        code: `${org === ORG1_ID ? "ACM" : "GLX"}-${deptNames[i].substring(0, 3).toUpperCase()}`,
        headUserId: org === ORG1_ID ? acmeHeadIds[i] : null,
      });
    }
  }

  await prisma.department.createMany({ data: departments });
  console.log(`  Created ${departments.length} departments`);

  // ── Cost Centers ──
  const costCenters: { id: string; departmentId: string; name: string; code: string }[] = [];
  for (const dept of departments) {
    costCenters.push(
      { id: `cc-${dept.id}-ops`, departmentId: dept.id, name: `${dept.name} Operations`, code: `${dept.code}-OPS` },
      { id: `cc-${dept.id}-proj`, departmentId: dept.id, name: `${dept.name} Projects`, code: `${dept.code}-PRJ` },
    );
  }
  await prisma.costCenter.createMany({ data: costCenters });
  console.log(`  Created ${costCenters.length} cost centers`);

  // ── Org Members ──
  // Start with the 6 demo users
  const orgMembers: { id: string; userId: string; organizationId: string; departmentId?: string; role: OrgRole; title: string }[] = [
    { id: uuid(), userId: ADMIN_ID, organizationId: ORG1_ID, role: "SUPER_ADMIN" as OrgRole, title: "System Administrator" },
    { id: uuid(), userId: CFO_ID, organizationId: ORG1_ID, departmentId: departments.find((d) => d.name === "Finance" && d.organizationId === ORG1_ID)!.id, role: "CFO" as OrgRole, title: "Chief Financial Officer" },
    { id: uuid(), userId: FM_ID, organizationId: ORG1_ID, departmentId: departments.find((d) => d.name === "Finance" && d.organizationId === ORG1_ID)!.id, role: "FINANCE_MANAGER" as OrgRole, title: "Finance Manager" },
    { id: uuid(), userId: DH_ID, organizationId: ORG1_ID, departmentId: departments.find((d) => d.name === "Engineering" && d.organizationId === ORG1_ID)!.id, role: "DEPARTMENT_HEAD" as OrgRole, title: "VP Engineering" },
    { id: uuid(), userId: EMP_ID, organizationId: ORG1_ID, departmentId: departments.find((d) => d.name === "Engineering" && d.organizationId === ORG1_ID)!.id, role: "EMPLOYEE" as OrgRole, title: "Software Engineer" },
    { id: uuid(), userId: AUDITOR_ID, organizationId: ORG1_ID, role: "AUDITOR" as OrgRole, title: "Internal Auditor" },
  ];

  // Distribute staff users across all Acme departments as members
  const acmeDepartments = departments.filter((d) => d.organizationId === ORG1_ID);
  // Target headcount per dept: Engineering 18, Sales 12, Marketing 8, Finance 5, HR 4, Operations 6, Legal 3, Support 7, Product 6, Design 4, QA 5, Executive 2
  const targetHeadcounts = [18, 12, 8, 5, 4, 6, 3, 7, 6, 4, 5, 2];
  const titles: Record<string, string[]> = {
    Engineering: ["Senior Engineer", "Staff Engineer", "Software Engineer", "DevOps Engineer", "Frontend Developer", "Backend Developer", "Tech Lead", "Platform Engineer"],
    Sales: ["Account Executive", "Sales Rep", "Sales Manager", "BDR", "Enterprise AE", "Solutions Consultant"],
    Marketing: ["Content Strategist", "Growth Manager", "Brand Manager", "SEO Specialist", "Campaign Manager"],
    Finance: ["Financial Analyst", "Controller", "Accounts Manager"],
    HR: ["HR Business Partner", "Recruiter", "People Ops Specialist"],
    Operations: ["Operations Manager", "Logistics Coordinator", "Procurement Specialist", "Facilities Manager"],
    Legal: ["Corporate Counsel", "Compliance Officer", "Paralegal"],
    Support: ["Support Engineer", "Customer Success Manager", "Support Lead", "Technical Writer"],
    Product: ["Product Manager", "Product Designer", "Program Manager", "Business Analyst"],
    Design: ["UI Designer", "UX Researcher", "Design Lead"],
    QA: ["QA Engineer", "Test Lead", "Automation Engineer", "SDET"],
    Executive: ["Chief of Staff", "Executive Assistant"],
  };

  let staffIdx = 12; // Skip first 12 (used as dept heads except index 0 which is DH_ID)
  for (let deptIdx = 0; deptIdx < acmeDepartments.length; deptIdx++) {
    const dept = acmeDepartments[deptIdx];
    const headcount = targetHeadcounts[deptIdx];
    const deptTitles = titles[dept.name] || ["Team Member"];

    // Department head (already has a user assigned; create org member for heads that aren't the 6 demo users)
    if (deptIdx > 0) { // deptIdx 0 = Engineering, head is DH_ID (already in orgMembers)
      const headUserId = acmeHeadIds[deptIdx];
      orgMembers.push({
        id: uuid(),
        userId: headUserId,
        organizationId: ORG1_ID,
        departmentId: dept.id,
        role: "DEPARTMENT_HEAD" as OrgRole,
        title: `Head of ${dept.name}`,
      });
    }

    // Add remaining staff members to the department
    for (let m = 0; m < headcount - 1 && staffIdx < staffUsers.length; m++) {
      const staffUser = staffUsers[staffIdx];
      orgMembers.push({
        id: uuid(),
        userId: staffUser.id,
        organizationId: ORG1_ID,
        departmentId: dept.id,
        role: "EMPLOYEE" as OrgRole,
        title: deptTitles[m % deptTitles.length],
      });
      staffIdx++;
    }
  }

  await prisma.orgMember.createMany({ data: orgMembers });
  console.log(`  Created ${orgMembers.length} org members across ${acmeDepartments.length} departments`);

  // ── GL Accounts (Standard Chart) ──
  const glAccounts: { id: string; organizationId: string; code: string; name: string; classification: AccountClassification; normalBalance: NormalBalance; parentId: string | null; description: string | null }[] = [];

  const chartOfAccounts = [
    // ASSETS (1xxx)
    { code: "1000", name: "Assets", classification: "ASSET" as AccountClassification, normalBalance: "DEBIT" as NormalBalance, children: [
      { code: "1010", name: "Cash - Operating", description: "Primary operating cash account" },
      { code: "1020", name: "Cash - Payroll", description: "Payroll disbursement account" },
      { code: "1030", name: "Petty Cash", description: "Petty cash on hand" },
      { code: "1100", name: "Accounts Receivable", description: "Trade receivables" },
      { code: "1110", name: "Allowance for Doubtful Accounts", description: "Contra account for AR" },
      { code: "1200", name: "Prepaid Expenses", description: "Prepaid insurance, rent, etc." },
      { code: "1210", name: "Prepaid Insurance", description: "Insurance paid in advance" },
      { code: "1300", name: "Inventory", description: "Merchandise inventory" },
      { code: "1500", name: "Fixed Assets", description: "Property, plant, and equipment" },
      { code: "1510", name: "Office Equipment", description: "Computers, furniture" },
      { code: "1520", name: "Vehicles", description: "Company vehicles" },
      { code: "1530", name: "Leasehold Improvements", description: "Office improvements" },
      { code: "1600", name: "Accumulated Depreciation", description: "Contra asset account" },
      { code: "1700", name: "Intangible Assets", description: "Patents, trademarks, goodwill" },
    ]},
    // LIABILITIES (2xxx)
    { code: "2000", name: "Liabilities", classification: "LIABILITY" as AccountClassification, normalBalance: "CREDIT" as NormalBalance, children: [
      { code: "2010", name: "Accounts Payable", description: "Trade payables" },
      { code: "2020", name: "Accrued Expenses", description: "Accrued liabilities" },
      { code: "2030", name: "Payroll Liabilities", description: "Wages and taxes payable" },
      { code: "2040", name: "Sales Tax Payable", description: "Collected sales tax" },
      { code: "2050", name: "Income Tax Payable", description: "Corporate income tax" },
      { code: "2100", name: "Unearned Revenue", description: "Deferred revenue" },
      { code: "2200", name: "Short-Term Loans", description: "Line of credit" },
      { code: "2500", name: "Long-Term Debt", description: "Term loans and bonds" },
      { code: "2510", name: "Mortgage Payable", description: "Real estate loans" },
      { code: "2600", name: "Lease Obligations", description: "Operating and finance leases" },
    ]},
    // EQUITY (3xxx)
    { code: "3000", name: "Equity", classification: "EQUITY" as AccountClassification, normalBalance: "CREDIT" as NormalBalance, children: [
      { code: "3010", name: "Common Stock", description: "Issued common shares" },
      { code: "3020", name: "Additional Paid-In Capital", description: "Capital in excess of par" },
      { code: "3030", name: "Retained Earnings", description: "Accumulated profits" },
      { code: "3040", name: "Treasury Stock", description: "Repurchased shares" },
      { code: "3050", name: "Dividends", description: "Distributions to shareholders" },
    ]},
    // REVENUE (4xxx)
    { code: "4000", name: "Revenue", classification: "REVENUE" as AccountClassification, normalBalance: "CREDIT" as NormalBalance, children: [
      { code: "4010", name: "Product Revenue", description: "Sales of products" },
      { code: "4020", name: "Service Revenue", description: "Consulting and services" },
      { code: "4030", name: "Subscription Revenue", description: "Recurring SaaS revenue" },
      { code: "4040", name: "Interest Income", description: "Interest earned on deposits" },
      { code: "4050", name: "Other Income", description: "Miscellaneous income" },
      { code: "4100", name: "Sales Returns & Allowances", description: "Contra revenue" },
      { code: "4200", name: "Sales Discounts", description: "Early payment discounts given" },
    ]},
    // EXPENSES (5xxx-6xxx)
    { code: "5000", name: "Cost of Goods Sold", classification: "EXPENSE" as AccountClassification, normalBalance: "DEBIT" as NormalBalance, children: [
      { code: "5010", name: "Direct Materials", description: "Raw materials cost" },
      { code: "5020", name: "Direct Labor", description: "Production labor cost" },
      { code: "5030", name: "Manufacturing Overhead", description: "Factory overhead" },
    ]},
    { code: "6000", name: "Operating Expenses", classification: "EXPENSE" as AccountClassification, normalBalance: "DEBIT" as NormalBalance, children: [
      { code: "6010", name: "Salaries & Wages", description: "Employee compensation" },
      { code: "6020", name: "Employee Benefits", description: "Health insurance, 401k, etc." },
      { code: "6030", name: "Payroll Taxes", description: "FICA, unemployment" },
      { code: "6040", name: "Rent Expense", description: "Office rent" },
      { code: "6050", name: "Utilities", description: "Electric, water, internet" },
      { code: "6060", name: "Office Supplies", description: "Office consumables" },
      { code: "6070", name: "Insurance", description: "Business insurance" },
      { code: "6080", name: "Depreciation", description: "Asset depreciation" },
      { code: "6090", name: "Professional Services", description: "Legal, accounting fees" },
      { code: "6100", name: "Travel & Entertainment", description: "Business travel" },
      { code: "6110", name: "Marketing & Advertising", description: "Marketing spend" },
      { code: "6120", name: "Software & Technology", description: "SaaS subscriptions, hosting" },
      { code: "6130", name: "Training & Development", description: "Employee training" },
      { code: "6140", name: "Repairs & Maintenance", description: "Equipment maintenance" },
      { code: "6150", name: "Bank Fees", description: "Bank service charges" },
      { code: "6160", name: "Interest Expense", description: "Interest on debt" },
      { code: "6170", name: "Bad Debt Expense", description: "Uncollectible accounts" },
      { code: "6180", name: "Income Tax Expense", description: "Corporate taxes" },
      { code: "6190", name: "Miscellaneous Expense", description: "Other expenses" },
    ]},
  ];

  for (const org of [ORG1_ID, ORG2_ID]) {
    for (const parent of chartOfAccounts) {
      const parentId = `gl-${org.slice(-3)}-${parent.code}`;
      glAccounts.push({
        id: parentId, organizationId: org, code: parent.code, name: parent.name,
        classification: parent.classification, normalBalance: parent.normalBalance,
        parentId: null, description: null,
      });
      for (const child of parent.children) {
        glAccounts.push({
          id: `gl-${org.slice(-3)}-${child.code}`, organizationId: org, code: child.code,
          name: child.name, classification: parent.classification, normalBalance: parent.normalBalance,
          parentId, description: child.description || null,
        });
      }
    }
  }

  await prisma.gLAccount.createMany({ data: glAccounts });
  console.log(`  Created ${glAccounts.length} GL accounts`);

  // ── Fiscal Periods ──
  const periods: { id: string; organizationId: string; name: string; startDate: Date; endDate: Date; isClosed: boolean }[] = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (const org of [ORG1_ID, ORG2_ID]) {
    for (let m = 0; m < 12; m++) {
      const year = m < 10 ? 2025 : 2026;
      const month = m < 10 ? m + 3 : m - 9; // FY starts April
      const actualMonth = (m + 3) % 12;
      const actualYear = m + 3 >= 12 ? 2026 : 2025;
      periods.push({
        id: `fp-${org.slice(-3)}-${actualYear}-${String(actualMonth + 1).padStart(2, "0")}`,
        organizationId: org,
        name: `${monthNames[actualMonth]} ${actualYear}`,
        startDate: new Date(actualYear, actualMonth, 1),
        endDate: new Date(actualYear, actualMonth + 1, 0),
        isClosed: actualYear < 2026 || (actualYear === 2026 && actualMonth < 1),
      });
    }
  }

  await prisma.fiscalPeriod.createMany({ data: periods });
  console.log(`  Created ${periods.length} fiscal periods`);

  // ── Journal Entries (500+ balanced entries) ──
  console.log("  Creating journal entries...");
  const org1Accounts = glAccounts.filter((a) => a.organizationId === ORG1_ID && a.parentId !== null);
  const revenueAccounts = org1Accounts.filter((a) => a.classification === "REVENUE");
  const expenseAccounts = org1Accounts.filter((a) => a.classification === "EXPENSE");
  const assetAccounts = org1Accounts.filter((a) => a.classification === "ASSET");
  const liabilityAccounts = org1Accounts.filter((a) => a.classification === "LIABILITY");

  let jeCount = 0;
  // Generate journal entries from Jan 2025 through the current month
  const now = new Date();
  const startYear = 2025;
  const startMonth = 0; // January
  const endYear = now.getFullYear();
  const endMonth = now.getMonth();
  const liabilityAccounts2 = org1Accounts.filter((a) => a.classification === "LIABILITY");
  const equityAccounts = org1Accounts.filter((a) => a.classification === "EQUITY");

  for (let y = startYear; y <= endYear; y++) {
    const mStart = y === startYear ? startMonth : 0;
    const mEnd = y === endYear ? endMonth : 11;

    for (let month = mStart; month <= mEnd; month++) {
      const period = periods.find((p) => p.organizationId === ORG1_ID && p.name.includes(String(y)));
      const maxDay = Math.min(28, new Date(y, month + 1, 0).getDate());
      const monthDate = new Date(y, month, randInt(1, maxDay));
      const yearPrefix = `JE-${y}`;

      // Monthly revenue entries (5-8 per month)
      for (let i = 0; i < randInt(5, 8); i++) {
        jeCount++;
        const amount = parseFloat(rand(5000, 80000).toFixed(2));
        const entryNumber = `${yearPrefix}-${String(jeCount).padStart(6, "0")}`;
        const revAccount = pick(revenueAccounts);
        const cashAccount = org1Accounts.find((a) => a.code === "1010")!;

        await prisma.journalEntry.create({
          data: {
            organizationId: ORG1_ID,
            entryNumber,
            description: `Revenue recognition - ${revAccount.name}`,
            date: monthDate,
            status: "POSTED",
            createdById: FM_ID,
            approvedById: CFO_ID,
            postedAt: addDays(monthDate, 1),
            periodId: period?.id,
            lines: {
              create: [
                { glAccountId: cashAccount.id, debit: amount, credit: 0, description: "Cash received" },
                { glAccountId: revAccount.id, debit: 0, credit: amount, description: revAccount.name },
              ],
            },
          },
        });
      }

      // Monthly expense entries (8-15 per month)
      for (let i = 0; i < randInt(8, 15); i++) {
        jeCount++;
        const amount = parseFloat(rand(500, 25000).toFixed(2));
        const entryNumber = `${yearPrefix}-${String(jeCount).padStart(6, "0")}`;
        const expAccount = pick(expenseAccounts);
        const cashAccount = org1Accounts.find((a) => a.code === "1010")!;

        await prisma.journalEntry.create({
          data: {
            organizationId: ORG1_ID,
            entryNumber,
            description: `${expAccount.name} payment`,
            date: monthDate,
            status: "POSTED",
            createdById: FM_ID,
            approvedById: CFO_ID,
            postedAt: addDays(monthDate, 1),
            periodId: period?.id,
            lines: {
              create: [
                { glAccountId: expAccount.id, debit: amount, credit: 0, description: expAccount.name },
                { glAccountId: cashAccount.id, debit: 0, credit: amount, description: "Cash payment" },
              ],
            },
          },
        });
      }

      // AP/AR entries (3-5 per month)
      for (let i = 0; i < randInt(3, 5); i++) {
        jeCount++;
        const amount = parseFloat(rand(2000, 50000).toFixed(2));
        const entryNumber = `${yearPrefix}-${String(jeCount).padStart(6, "0")}`;
        const arAccount = org1Accounts.find((a) => a.code === "1100")!;
        const revAccount = pick(revenueAccounts);

        await prisma.journalEntry.create({
          data: {
            organizationId: ORG1_ID,
            entryNumber,
            description: "Customer invoice issued",
            date: monthDate,
            status: "POSTED",
            createdById: FM_ID,
            approvedById: CFO_ID,
            postedAt: addDays(monthDate, 1),
            periodId: period?.id,
            lines: {
              create: [
                { glAccountId: arAccount.id, debit: amount, credit: 0, description: "Accounts receivable" },
                { glAccountId: revAccount.id, debit: 0, credit: amount, description: "Revenue recognized" },
              ],
            },
          },
        });
      }

      // Investing entries (1-2 per month) — fixed asset purchases
      for (let i = 0; i < randInt(1, 2); i++) {
        jeCount++;
        const amount = parseFloat(rand(2000, 30000).toFixed(2));
        const entryNumber = `${yearPrefix}-${String(jeCount).padStart(6, "0")}`;
        const fixedAsset = pick(org1Accounts.filter((a) => ["1510", "1520", "1530"].includes(a.code)));
        const cashAccount = org1Accounts.find((a) => a.code === "1010")!;

        await prisma.journalEntry.create({
          data: {
            organizationId: ORG1_ID,
            entryNumber,
            description: `Capital expenditure - ${fixedAsset.name}`,
            date: monthDate,
            status: "POSTED",
            createdById: FM_ID,
            approvedById: CFO_ID,
            postedAt: addDays(monthDate, 1),
            periodId: period?.id,
            lines: {
              create: [
                { glAccountId: fixedAsset.id, debit: amount, credit: 0, description: fixedAsset.name },
                { glAccountId: cashAccount.id, debit: 0, credit: amount, description: "Cash payment for asset" },
              ],
            },
          },
        });
      }

      // Financing entries (1 per month) — debt payments or equity transactions
      if (liabilityAccounts2.length > 0) {
        jeCount++;
        const amount = parseFloat(rand(5000, 20000).toFixed(2));
        const entryNumber = `${yearPrefix}-${String(jeCount).padStart(6, "0")}`;
        const debtAccount = pick(liabilityAccounts2.filter((a) => ["2200", "2500", "2510", "2600"].includes(a.code)));
        const cashAccount = org1Accounts.find((a) => a.code === "1010")!;

        if (debtAccount) {
          await prisma.journalEntry.create({
            data: {
              organizationId: ORG1_ID,
              entryNumber,
              description: `Debt repayment - ${debtAccount.name}`,
              date: monthDate,
              status: "POSTED",
              createdById: FM_ID,
              approvedById: CFO_ID,
              postedAt: addDays(monthDate, 1),
              periodId: period?.id,
              lines: {
                create: [
                  { glAccountId: debtAccount.id, debit: amount, credit: 0, description: "Debt repayment" },
                  { glAccountId: cashAccount.id, debit: 0, credit: amount, description: "Cash paid" },
                ],
              },
            },
          });
        }
      }
    }
  }

  // Some draft/pending entries for demo
  for (let i = 0; i < 5; i++) {
    jeCount++;
    const amount = parseFloat(rand(1000, 10000).toFixed(2));
    await prisma.journalEntry.create({
      data: {
        organizationId: ORG1_ID,
        entryNumber: `JE-${endYear}-${String(jeCount).padStart(6, "0")}`,
        description: `Pending entry #${i + 1}`,
        date: new Date(endYear, endMonth, randInt(1, 14)),
        status: i < 3 ? "PENDING_APPROVAL" : "DRAFT",
        createdById: FM_ID,
        lines: {
          create: [
            { glAccountId: pick(expenseAccounts).id, debit: amount, credit: 0 },
            { glAccountId: org1Accounts.find((a) => a.code === "1010")!.id, debit: 0, credit: amount },
          ],
        },
      },
    });
  }

  console.log(`  Created ${jeCount} journal entries`);

  // ── Vendors ──
  const vendorNames = [
    "TechSupply Co", "CloudHost Inc", "Office Depot", "FedEx Shipping", "Adobe Systems",
    "Google Cloud", "Amazon AWS", "Microsoft Azure", "Salesforce", "HubSpot",
    "WeWork Spaces", "Uber Business", "Delta Airlines", "Marriott Hotels", "Staples",
    "ADP Payroll", "Gusto Benefits", "Slack Technologies", "Zoom Video", "GitHub Inc",
    "DocuSign", "Dropbox Business", "Netlify", "Vercel Inc", "Stripe Inc",
    "Twilio", "SendGrid", "Datadog", "New Relic", "PagerDuty",
  ];

  const vendors = vendorNames.map((name, i) => ({
    id: `vendor-${String(i + 1).padStart(3, "0")}`,
    organizationId: ORG1_ID,
    name,
    code: `V-${String(i + 1).padStart(3, "0")}`,
    email: `billing@${name.toLowerCase().replace(/\s+/g, "")}.com`,
    taxId: `${randInt(10, 99)}-${randInt(1000000, 9999999)}`,
    paymentTerms: pick([15, 30, 45, 60]),
    bankDetails: { routingNumber: `${randInt(100000000, 999999999)}`, accountNumber: `${randInt(100000000, 999999999)}` },
    riskScore: parseFloat(rand(10, 85).toFixed(2)),
  }));

  await prisma.vendor.createMany({ data: vendors });
  console.log(`  Created ${vendors.length} vendors`);

  // ── AP Invoices (200 across aging buckets) ──
  const invoiceStatuses: InvoiceStatus[] = ["RECEIVED", "PENDING_APPROVAL", "APPROVED", "PARTIALLY_PAID", "PAID", "OVERDUE"];
  const invoices: {
    id: string; organizationId: string; vendorId: string; invoiceNumber: string;
    amount: number; taxAmount: number; totalAmount: number; status: InvoiceStatus;
    dueDate: Date; lineItems: object;
  }[] = [];

  for (let i = 0; i < 200; i++) {
    const amount = parseFloat(rand(500, 50000).toFixed(2));
    const taxAmount = parseFloat((amount * 0.08).toFixed(2));
    const daysAgo = randInt(-30, 120); // Some future, some past
    const dueDate = addDays(new Date(), -daysAgo);

    let status: InvoiceStatus;
    if (daysAgo > 90) status = pick(["PAID", "PAID", "OVERDUE"] as InvoiceStatus[]);
    else if (daysAgo > 30) status = pick(["PAID", "PARTIALLY_PAID", "OVERDUE", "APPROVED"] as InvoiceStatus[]);
    else if (daysAgo > 0) status = pick(["APPROVED", "PARTIALLY_PAID", "RECEIVED"] as InvoiceStatus[]);
    else status = pick(["RECEIVED", "PENDING_APPROVAL"] as InvoiceStatus[]);

    invoices.push({
      id: `inv-${String(i + 1).padStart(4, "0")}`,
      organizationId: ORG1_ID,
      vendorId: pick(vendors).id,
      invoiceNumber: `INV-${2025 + Math.floor(i / 100)}-${String((i % 100) + 1).padStart(4, "0")}`,
      amount,
      taxAmount,
      totalAmount: amount + taxAmount,
      status,
      dueDate,
      lineItems: [
        { description: "Professional Services", quantity: 1, unitPrice: amount * 0.6, amount: amount * 0.6 },
        { description: "Materials & Supplies", quantity: 1, unitPrice: amount * 0.4, amount: amount * 0.4 },
      ],
    });
  }

  await prisma.invoice.createMany({ data: invoices });
  console.log(`  Created ${invoices.length} AP invoices`);

  // ── Customers ──
  const customerNames = [
    "Stark Industries", "Wayne Enterprises", "Umbrella Corp", "Cyberdyne Systems",
    "Weyland-Yutani", "Soylent Corp", "Initech", "Prestige Worldwide",
    "Dunder Mifflin", "Sterling Cooper", "Los Pollos Hermanos", "Pied Piper",
    "Hooli", "Raviga Capital", "Bachmanity", "Dinesh & Gilfoyle LLC",
    "Massive Dynamic", "Oscorp Industries", "LexCorp", "Queen Consolidated",
  ];

  const customers = customerNames.map((name, i) => ({
    id: `cust-${String(i + 1).padStart(3, "0")}`,
    organizationId: ORG1_ID,
    name,
    code: `C-${String(i + 1).padStart(3, "0")}`,
    email: `ap@${name.toLowerCase().replace(/[^a-z]/g, "")}.com`,
    creditLimit: parseFloat(rand(50000, 500000).toFixed(2)),
    paymentTerms: pick([15, 30, 45, 60]),
  }));

  await prisma.customer.createMany({ data: customers });
  console.log(`  Created ${customers.length} customers`);

  // ── AR Invoices (150) ──
  const arInvoices: {
    id: string; organizationId: string; customerId: string; invoiceNumber: string;
    totalAmount: number; status: CustomerInvoiceStatus; dueDate: Date; lineItems: object;
  }[] = [];

  for (let i = 0; i < 150; i++) {
    const amount = parseFloat(rand(1000, 100000).toFixed(2));
    const daysAgo = randInt(-30, 120);
    const dueDate = addDays(new Date(), -daysAgo);

    let status: CustomerInvoiceStatus;
    if (daysAgo > 90) status = pick(["PAID", "PAID", "OVERDUE"] as CustomerInvoiceStatus[]);
    else if (daysAgo > 30) status = pick(["PAID", "PARTIALLY_PAID", "OVERDUE"] as CustomerInvoiceStatus[]);
    else if (daysAgo > 0) status = pick(["SENT", "PARTIALLY_PAID"] as CustomerInvoiceStatus[]);
    else status = pick(["DRAFT", "SENT"] as CustomerInvoiceStatus[]);

    arInvoices.push({
      id: `cinv-${String(i + 1).padStart(4, "0")}`,
      organizationId: ORG1_ID,
      customerId: pick(customers).id,
      invoiceNumber: `CI-${2025 + Math.floor(i / 80)}-${String((i % 80) + 1).padStart(4, "0")}`,
      totalAmount: amount,
      status,
      dueDate,
      lineItems: [
        { description: "Consulting Services", quantity: randInt(10, 100), unitPrice: parseFloat((amount / randInt(10, 100)).toFixed(2)), amount },
      ],
    });
  }

  await prisma.customerInvoice.createMany({ data: arInvoices });
  console.log(`  Created ${arInvoices.length} AR invoices`);

  // ── Payments ──
  const payments: { id: string; organizationId: string; invoiceId?: string; customerInvoiceId?: string; amount: number; method: string; reference: string; paidAt: Date }[] = [];

  // AP payments
  for (const inv of invoices.filter((i) => ["PAID", "PARTIALLY_PAID"].includes(i.status))) {
    const payAmount = inv.status === "PAID" ? inv.totalAmount : parseFloat((inv.totalAmount * rand(0.3, 0.7)).toFixed(2));
    payments.push({
      id: uuid(),
      organizationId: ORG1_ID,
      invoiceId: inv.id,
      amount: payAmount,
      method: pick(["bank_transfer", "check", "ach", "wire"]),
      reference: `PAY-${randInt(10000, 99999)}`,
      paidAt: addDays(inv.dueDate, randInt(-10, 5)),
    });
  }

  // AR payments
  for (const inv of arInvoices.filter((i) => ["PAID", "PARTIALLY_PAID"].includes(i.status))) {
    const payAmount = inv.status === "PAID" ? inv.totalAmount : parseFloat((inv.totalAmount * rand(0.3, 0.7)).toFixed(2));
    payments.push({
      id: uuid(),
      organizationId: ORG1_ID,
      customerInvoiceId: inv.id,
      amount: payAmount,
      method: pick(["bank_transfer", "check", "ach", "credit_card"]),
      reference: `RCV-${randInt(10000, 99999)}`,
      paidAt: addDays(inv.dueDate, randInt(-5, 15)),
    });
  }

  await prisma.payment.createMany({ data: payments });
  console.log(`  Created ${payments.length} payments`);

  // ── Workflow Templates ──
  const wfTemplates = [
    {
      id: "wf-expense-approval",
      organizationId: ORG1_ID,
      type: "EXPENSE_APPROVAL" as WorkflowType,
      name: "Expense Approval Workflow",
      config: { autoApproveUnder: 50 },
      steps: [
        { stepOrder: 1, name: "Department Head Review", approverRole: "DEPARTMENT_HEAD" as OrgRole, condition: { minAmount: 50 } },
        { stepOrder: 2, name: "Finance Manager Approval", approverRole: "FINANCE_MANAGER" as OrgRole, condition: { minAmount: 5000 } },
        { stepOrder: 3, name: "CFO Approval", approverRole: "CFO" as OrgRole, condition: { minAmount: 25000 } },
      ],
    },
    {
      id: "wf-journal-approval",
      organizationId: ORG1_ID,
      type: "JOURNAL_APPROVAL" as WorkflowType,
      name: "Journal Entry Approval",
      config: {},
      steps: [
        { stepOrder: 1, name: "Finance Manager Review", approverRole: "FINANCE_MANAGER" as OrgRole, condition: Prisma.JsonNull },
        { stepOrder: 2, name: "CFO Approval", approverRole: "CFO" as OrgRole, condition: { minAmount: 50000 } },
      ],
    },
    {
      id: "wf-vendor-onboarding",
      organizationId: ORG1_ID,
      type: "VENDOR_ONBOARDING" as WorkflowType,
      name: "Vendor Onboarding",
      config: {},
      steps: [
        { stepOrder: 1, name: "Finance Review", approverRole: "FINANCE_MANAGER" as OrgRole, condition: Prisma.JsonNull },
        { stepOrder: 2, name: "Compliance Check", approverRole: "CFO" as OrgRole, condition: Prisma.JsonNull },
      ],
    },
  ];

  for (const wf of wfTemplates) {
    await prisma.workflowTemplate.create({
      data: {
        id: wf.id,
        organizationId: wf.organizationId,
        type: wf.type,
        name: wf.name,
        config: wf.config,
        steps: { create: wf.steps },
      },
    });
  }
  console.log(`  Created ${wfTemplates.length} workflow templates`);

  // ── Expenses (100 in various stages) ──
  const expenseCategories = ["meals", "travel", "accommodation", "transportation", "office_supplies", "software", "training"];
  const expenseStatuses: ExpenseStatus[] = ["DRAFT", "SUBMITTED", "PENDING_APPROVAL", "APPROVED", "REJECTED", "REIMBURSED"];
  const expenses: {
    id: string; organizationId: string; submittedById: string; departmentId: string;
    title: string; amount: number; categorySlug: string; status: ExpenseStatus;
    receiptUrl: string | null; occurredAt: Date;
  }[] = [];

  const engDept = departments.find((d) => d.name === "Engineering" && d.organizationId === ORG1_ID)!;

  for (let i = 0; i < 100; i++) {
    const cat = pick(expenseCategories);
    const status = pick(expenseStatuses);
    let amount: number;
    if (cat === "travel") amount = parseFloat(rand(200, 5000).toFixed(2));
    else if (cat === "accommodation") amount = parseFloat(rand(100, 500).toFixed(2));
    else if (cat === "software") amount = parseFloat(rand(50, 2000).toFixed(2));
    else amount = parseFloat(rand(10, 300).toFixed(2));

    expenses.push({
      id: `exp-${String(i + 1).padStart(4, "0")}`,
      organizationId: ORG1_ID,
      submittedById: pick([EMP_ID, DH_ID, FM_ID]),
      departmentId: pick(departments.filter((d) => d.organizationId === ORG1_ID)).id,
      title: `${cat.replace(/_/g, " ")} - ${["Client meeting", "Team event", "Conference", "Office needs", "Training session", "Monthly subscription"][randInt(0, 5)]}`,
      amount,
      categorySlug: cat,
      status,
      receiptUrl: amount > 25 ? `https://receipts.finpulse.io/receipt-${i}.pdf` : null,
      occurredAt: addDays(new Date(), -randInt(0, 90)),
    });
  }

  await prisma.expense.createMany({ data: expenses });
  console.log(`  Created ${expenses.length} expenses`);

  // ── Workflow Instances for submitted expenses ──
  const submittedExpenses = expenses.filter((e) => ["SUBMITTED", "PENDING_APPROVAL", "APPROVED", "REJECTED"].includes(e.status));
  let wfCount = 0;

  for (const exp of submittedExpenses.slice(0, 50)) {
    const isApproved = exp.status === "APPROVED" || exp.status === "REIMBURSED";
    const isRejected = exp.status === "REJECTED";

    await prisma.workflowInstance.create({
      data: {
        templateId: "wf-expense-approval",
        resourceType: "expense",
        resourceId: exp.id,
        status: isApproved ? "APPROVED" : isRejected ? "REJECTED" : "IN_PROGRESS",
        submittedById: exp.submittedById,
        currentStep: isApproved ? 3 : isRejected ? 1 : 1,
        stepActions: {
          create: [
            {
              stepOrder: 1,
              actorId: isApproved || isRejected ? DH_ID : null,
              status: isApproved ? "APPROVED" : isRejected ? "REJECTED" : "PENDING",
              comment: isRejected ? "Missing receipt documentation" : isApproved ? "Looks good" : null,
              actedAt: isApproved || isRejected ? addDays(exp.occurredAt, 2) : null,
            },
            {
              stepOrder: 2,
              actorId: isApproved ? FM_ID : null,
              status: isApproved ? "APPROVED" : "PENDING",
              actedAt: isApproved ? addDays(exp.occurredAt, 3) : null,
            },
            {
              stepOrder: 3,
              actorId: isApproved && exp.amount > 25000 ? CFO_ID : null,
              status: isApproved ? "APPROVED" : "PENDING",
              actedAt: isApproved && exp.amount > 25000 ? addDays(exp.occurredAt, 4) : null,
            },
          ],
        },
      },
    });
    wfCount++;
  }
  console.log(`  Created ${wfCount} workflow instances`);

  // ── Budgets ──
  // Budget ranges per department type (realistic annual budgets)
  const budgetRanges: Record<string, [number, number]> = {
    Engineering: [1200000, 2000000],
    Sales: [800000, 1400000],
    Marketing: [600000, 1000000],
    Finance: [350000, 600000],
    HR: [250000, 450000],
    Operations: [400000, 700000],
    Legal: [200000, 400000],
    Support: [300000, 550000],
    Product: [400000, 700000],
    Design: [250000, 450000],
    QA: [300000, 500000],
    Executive: [500000, 900000],
  };

  const acmeDepts = departments.filter((d) => d.organizationId === ORG1_ID);

  for (const year of [2025, 2026]) {
    for (const dept of acmeDepts) {
      const range = budgetRanges[dept.name] || [200000, 500000];
      // 2026 budgets get a ~5% increase
      const multiplier = year === 2026 ? 1.05 : 1;
      const totalBudget = parseFloat((rand(range[0], range[1]) * multiplier).toFixed(2));
      const lineItemAccounts = expenseAccounts.slice(0, randInt(5, 10));
      // 2025 budgets are fully active with higher actuals; 2026 just started (lower actuals)
      const actualMultiplierRange: [number, number] = year === 2025 ? [0.7, 0.98] : [0.05, 0.2];

      await prisma.budget.create({
        data: {
          organizationId: ORG1_ID,
          departmentId: dept.id,
          fiscalYear: year,
          periodType: "ANNUAL",
          status: year === 2025 ? "CLOSED" : "ACTIVE",
          totalAmount: totalBudget,
          createdById: CFO_ID,
          lineItems: {
            create: lineItemAccounts.map((acc) => {
              const lineTotal = parseFloat((totalBudget / lineItemAccounts.length * rand(0.5, 1.5)).toFixed(2));
              const q1 = parseFloat((lineTotal * rand(0.2, 0.3)).toFixed(2));
              const q2 = parseFloat((lineTotal * rand(0.2, 0.3)).toFixed(2));
              const q3 = parseFloat((lineTotal * rand(0.2, 0.3)).toFixed(2));
              const q4 = parseFloat((lineTotal - q1 - q2 - q3).toFixed(2));
              return {
                glAccountId: acc.id,
                description: acc.name,
                q1Amount: q1,
                q2Amount: q2,
                q3Amount: q3,
                q4Amount: q4,
                totalAmount: lineTotal,
                actualAmount: parseFloat((lineTotal * rand(actualMultiplierRange[0], actualMultiplierRange[1])).toFixed(2)),
              };
            }),
          },
        },
      });
    }
  }
  console.log(`  Created ${acmeDepts.length * 2} department budgets (2025 + 2026)`);

  console.log("\nERP seed complete!");
  console.log(`  2 organizations, 6 subsidiaries, ${departments.length} departments`);
  console.log(`  ${glAccounts.length} GL accounts, ${periods.length} fiscal periods`);
  console.log(`  ${jeCount} journal entries, ${vendors.length} vendors, ${invoices.length} invoices`);
  console.log(`  ${customers.length} customers, ${arInvoices.length} AR invoices, ${payments.length} payments`);
  console.log(`  ${expenses.length} expenses, ${wfCount} workflow instances, ${acmeDepts.length} budgets`);
  console.log("\nDemo Accounts:");
  console.log("  admin@acme.io / admin123 (Super Admin)");
  console.log("  cfo@acme.io / demo123 (CFO)");
  console.log("  finance@acme.io / demo123 (Finance Manager)");
  console.log("  manager@acme.io / demo123 (Department Head)");
  console.log("  employee@acme.io / demo123 (Employee)");
  console.log("  auditor@acme.io / demo123 (Auditor)");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
