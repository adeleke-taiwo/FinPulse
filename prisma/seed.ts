import { PrismaClient, Role, AccountType, AccountStatus, TransactionType, TransactionStatus, RiskSeverity, RiskStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { v4 as uuid } from "uuid";

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function datesBetween(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function formatDateKey(d: Date): number {
  return (d.getFullYear() * 10000) + ((d.getMonth() + 1) * 100) + d.getDate();
}

const FIRST_NAMES = ["James","Emma","Liam","Olivia","Noah","Ava","Ethan","Sophia","Mason","Isabella","Lucas","Mia","Logan","Charlotte","Aiden","Amelia","Jackson","Harper","Sebastian","Evelyn","Alexander","Abigail","Henry","Emily","Owen","Elizabeth","Samuel","Sofia","Ryan","Ella","Nathan","Grace","Caleb","Chloe","Dylan","Victoria","Daniel","Riley","Matthew","Aria","Joseph","Lily","David","Aubrey","Carter","Zoey","Luke","Penelope","Gabriel","Layla"];
const LAST_NAMES = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores","Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts"];

// ── Categories ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: "Revenue", slug: "revenue", color: "#22c55e", icon: "trending-up", children: [
    { name: "Service Revenue", slug: "service-revenue", color: "#16a34a", icon: "briefcase" },
    { name: "Product Revenue", slug: "product-revenue", color: "#15803d", icon: "package" },
    { name: "Interest Income", slug: "interest-income", color: "#166534", icon: "bar-chart" },
  ]},
  { name: "Operating Expenses", slug: "operating-expenses", color: "#6366f1", icon: "building", children: [
    { name: "Payroll & Benefits", slug: "payroll-benefits", color: "#4f46e5", icon: "users" },
    { name: "Office & Facilities", slug: "office-facilities", color: "#4338ca", icon: "home" },
    { name: "Technology & Software", slug: "technology-software", color: "#3730a3", icon: "monitor" },
  ]},
  { name: "Professional Services", slug: "professional-services", color: "#f59e0b", icon: "file-text", children: [
    { name: "Legal & Compliance", slug: "legal-compliance", color: "#d97706", icon: "shield" },
    { name: "Accounting & Audit", slug: "accounting-audit", color: "#b45309", icon: "calculator" },
  ]},
  { name: "Travel & Entertainment", slug: "travel-entertainment", color: "#06b6d4", icon: "plane", children: [
    { name: "Business Travel", slug: "business-travel", color: "#0891b2", icon: "map" },
    { name: "Client Entertainment", slug: "client-entertainment", color: "#0e7490", icon: "coffee" },
  ]},
  { name: "Marketing & Sales", slug: "marketing-sales", color: "#ec4899", icon: "megaphone", children: [
    { name: "Marketing & Advertising", slug: "marketing-advertising", color: "#db2777", icon: "target" },
    { name: "Sales Commissions", slug: "sales-commissions", color: "#be185d", icon: "dollar-sign" },
  ]},
  { name: "Banking & Fees", slug: "banking-fees", color: "#64748b", icon: "alert-circle" },
  { name: "Depreciation & Amortization", slug: "depreciation-amortization", color: "#8b5cf6", icon: "trending-down" },
];

async function main() {
  console.log("🌱 Seeding FinPulse database...\n");

  // ── Clear existing data ──
  await prisma.$executeRawUnsafe("TRUNCATE TABLE risk_flags, audit_logs, data_uploads, transactions, accounts, categories, users CASCADE");
  console.log("  Cleared existing data");

  // ── Users ──
  const passwordHash = await hash("admin123", 12);
  const analystHash = await hash("analyst123", 12);
  const userHash = await hash("user123", 12);

  const users: { id: string; email: string; passwordHash: string; firstName: string; lastName: string; role: Role; isActive: boolean }[] = [];
  // 2 admins
  for (let i = 0; i < 2; i++) {
    users.push({
      id: uuid(),
      email: i === 0 ? "admin@acme.io" : `admin${i + 1}@acme.io`,
      passwordHash,
      firstName: FIRST_NAMES[i],
      lastName: LAST_NAMES[i],
      role: "ADMIN" as Role,
      isActive: true,
    });
  }
  // 8 analysts
  for (let i = 0; i < 8; i++) {
    users.push({
      id: uuid(),
      email: i === 0 ? "analyst@acme.io" : `analyst${i + 1}@acme.io`,
      passwordHash: analystHash,
      firstName: FIRST_NAMES[i + 2],
      lastName: LAST_NAMES[i + 2],
      role: "ANALYST" as Role,
      isActive: true,
    });
  }
  // 40 users
  for (let i = 0; i < 40; i++) {
    users.push({
      id: uuid(),
      email: i === 0 ? "user@acme.io" : `user${i + 1}@acme.io`,
      passwordHash: userHash,
      firstName: FIRST_NAMES[i % FIRST_NAMES.length],
      lastName: LAST_NAMES[(i + 10) % LAST_NAMES.length],
      role: "USER" as Role,
      isActive: i < 38, // 2 inactive
    });
  }

  await prisma.user.createMany({ data: users });
  console.log(`  Created ${users.length} users`);

  // ── Categories ──
  const categoryIds: Record<string, string> = {};
  const leafCategories: string[] = [];

  for (const cat of CATEGORIES) {
    const parentId = uuid();
    categoryIds[cat.slug] = parentId;
    await prisma.category.create({
      data: { id: parentId, name: cat.name, slug: cat.slug, color: cat.color, icon: cat.icon },
    });

    if (cat.children) {
      for (const child of cat.children) {
        const childId = uuid();
        categoryIds[child.slug] = childId;
        leafCategories.push(childId);
        await prisma.category.create({
          data: { id: childId, name: child.name, slug: child.slug, color: child.color, icon: child.icon, parentId },
        });
      }
    } else {
      leafCategories.push(parentId);
    }
  }
  console.log(`  Created ${Object.keys(categoryIds).length} categories`);

  // ── Accounts ──
  const accountTypes: AccountType[] = ["CHECKING", "SAVINGS", "INVESTMENT", "CREDIT", "LOAN"];
  const accounts: { id: string; userId: string; accountNumber: string; type: AccountType; balance: number; currency: string; status: AccountStatus }[] = [];

  for (const user of users) {
    const numAccounts = randInt(2, 5);
    const usedTypes = new Set<AccountType>();
    for (let j = 0; j < numAccounts; j++) {
      let aType: AccountType;
      do { aType = pick(accountTypes); } while (usedTypes.has(aType) && usedTypes.size < accountTypes.length);
      usedTypes.add(aType);
      accounts.push({
        id: uuid(),
        userId: user.id,
        accountNumber: Array.from({ length: 10 }, () => randInt(0, 9)).join(""),
        type: aType,
        balance: parseFloat(rand(500, 50000).toFixed(2)),
        currency: "USD",
        status: Math.random() > 0.05 ? "ACTIVE" : pick(["INACTIVE", "FROZEN"] as AccountStatus[]),
      });
    }
  }

  await prisma.account.createMany({ data: accounts.map(a => ({ ...a, balance: a.balance })) });
  console.log(`  Created ${accounts.length} accounts`);

  // ── Transactions (15K+ over 24 months) ──
  const startDate = new Date("2024-01-01");
  const endDate = new Date(); // seed through today so the dashboard always has recent data
  const days = datesBetween(startDate, endDate);
  const activeAccounts = accounts.filter((a) => a.status === "ACTIVE");
  const txTypes: TransactionType[] = ["CREDIT", "DEBIT", "TRANSFER", "FEE", "INTEREST", "REFUND"];
  const txWeights = [0.3, 0.35, 0.15, 0.05, 0.05, 0.1]; // cumulative probability
  const txStatuses: TransactionStatus[] = ["COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "PENDING", "FAILED", "REVERSED"];

  function pickWeighted(types: TransactionType[], weights: number[]): TransactionType {
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < types.length; i++) {
      cum += weights[i];
      if (r <= cum) return types[i];
    }
    return types[0];
  }

  const transactions: {
    id: string; fromAccountId: string | null; toAccountId: string | null;
    categoryId: string | null; type: TransactionType; status: TransactionStatus;
    amount: number; description: string; occurredAt: Date;
  }[] = [];

  for (const day of days) {
    const month = day.getMonth();
    const dow = day.getDay();
    // Seasonal + weekend variation
    const seasonMultiplier = 1 + 0.3 * Math.sin((month - 3) * Math.PI / 6);
    const weekendMultiplier = (dow === 0 || dow === 6) ? 0.6 : 1;
    // Growth trend over time
    const dayIdx = Math.floor((day.getTime() - startDate.getTime()) / 86400000);
    const growthMultiplier = 1 + (dayIdx / days.length) * 0.4;

    const baseTx = 20;
    const numTx = Math.round(baseTx * seasonMultiplier * weekendMultiplier * growthMultiplier + randInt(-3, 3));

    for (let t = 0; t < numTx; t++) {
      const txType = pickWeighted(txTypes, txWeights);
      const fromAcc = pick(activeAccounts);
      const toAcc = txType === "TRANSFER" ? pick(activeAccounts.filter(a => a.id !== fromAcc.id) || activeAccounts) : null;

      // ~3% anomalous with very high amounts
      const isAnomaly = Math.random() < 0.03;
      let amount: number;
      if (isAnomaly) {
        amount = parseFloat(rand(5000, 50000).toFixed(2));
      } else {
        amount = parseFloat(rand(5, 2000).toFixed(2));
      }

      const hour = randInt(6, 23);
      const minute = randInt(0, 59);
      const occurredAt = new Date(day);
      occurredAt.setHours(hour, minute, randInt(0, 59));

      transactions.push({
        id: uuid(),
        fromAccountId: fromAcc.id,
        toAccountId: toAcc?.id || null,
        categoryId: pick(leafCategories),
        type: txType,
        status: pick(txStatuses),
        amount,
        description: txType === "CREDIT" ? pick(["Client payment received", "Service invoice settled", "Product license renewal", "Subscription revenue", "Consulting fee received"])
          : txType === "DEBIT" ? pick(["Vendor payment", "Payroll disbursement", "Software subscription", "Office lease payment", "Cloud hosting charges", "Legal retainer fee", "Marketing campaign spend"])
          : txType === "TRANSFER" ? pick(["Inter-department transfer", "Operating account rebalance", "Reserve fund allocation"])
          : txType === "INTEREST" ? "Interest earned on deposit"
          : txType === "FEE" ? pick(["Wire transfer fee", "ACH processing fee", "Account maintenance fee", "Foreign exchange fee"])
          : pick(["Client overpayment refund", "Vendor credit applied", "Duplicate payment reversal"]),
        occurredAt,
      });
    }
  }

  // Batch insert transactions
  const BATCH = 1000;
  for (let i = 0; i < transactions.length; i += BATCH) {
    const batch = transactions.slice(i, i + BATCH);
    await prisma.transaction.createMany({
      data: batch.map((tx) => ({
        id: tx.id,
        fromAccountId: tx.fromAccountId,
        toAccountId: tx.toAccountId,
        categoryId: tx.categoryId,
        type: tx.type,
        status: tx.status,
        amount: tx.amount,
        description: tx.description,
        occurredAt: tx.occurredAt,
      })),
    });
  }
  console.log(`  Created ${transactions.length} transactions`);

  // ── Risk Flags (~50) ──
  const anomalousTx = transactions
    .filter((tx) => tx.amount > 5000)
    .slice(0, 50);

  const riskFlags = anomalousTx.map((tx) => {
    const riskScore = parseFloat(rand(50, 99).toFixed(2));
    const severity: RiskSeverity = riskScore > 90 ? "CRITICAL" : riskScore > 75 ? "HIGH" : riskScore > 50 ? "MEDIUM" : "LOW";
    return {
      id: uuid(),
      transactionId: tx.id,
      severity,
      status: pick(["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"] as RiskStatus[]),
      ruleTriggered: pick(["high_amount", "unusual_pattern", "velocity_check", "geo_anomaly", "round_amount"]),
      riskScore,
    };
  });

  await prisma.riskFlag.createMany({ data: riskFlags });
  console.log(`  Created ${riskFlags.length} risk flags`);

  // ── Audit Logs ──
  const auditActions = ["user.login", "user.create", "transaction.create", "transaction.export", "settings.update", "upload.process"];
  const auditLogs = Array.from({ length: 200 }, () => ({
    id: uuid(),
    actorId: pick(users).id,
    action: pick(auditActions),
    resource: pick(["user", "transaction", "account", "settings", "upload"]),
    resourceId: uuid(),
    ipAddress: `192.168.${randInt(1, 255)}.${randInt(1, 255)}`,
    createdAt: new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())),
  }));

  await prisma.auditLog.createMany({ data: auditLogs });
  console.log(`  Created ${auditLogs.length} audit logs`);

  // ── TimescaleDB: Transaction Metrics (optional) ──
  console.log("\n  Populating TimescaleDB hypertables...");
  try {
    const txMetricValues: string[] = [];
    for (const tx of transactions) {
      const isFlagged = tx.amount > 5000;
      txMetricValues.push(
        `('${tx.occurredAt.toISOString()}', ${tx.fromAccountId ? `'${tx.fromAccountId}'` : "NULL"}, ${tx.categoryId ? `'${tx.categoryId}'` : "NULL"}, '${tx.type}', ${tx.amount}, 1, ${isFlagged})`
      );
    }

    for (let i = 0; i < txMetricValues.length; i += BATCH) {
      const batch = txMetricValues.slice(i, i + BATCH);
      await prisma.$executeRawUnsafe(
        `INSERT INTO ts_transaction_metrics (time, account_id, category_id, tx_type, amount, tx_count, is_flagged) VALUES ${batch.join(",")}`
      );
    }
    console.log(`  Inserted ${txMetricValues.length} ts_transaction_metrics rows`);
  } catch {
    console.log("  Skipped ts_transaction_metrics (TimescaleDB not available)");
  }

  // ── TimescaleDB: Crypto Prices (365 days, optional) ──
  try {
    const cryptoSymbols = ["BTC", "ETH", "SOL"];
    const basePrices: Record<string, number> = { BTC: 42000, ETH: 2200, SOL: 100 };
    const cryptoValues: string[] = [];
    const cryptoStart = new Date("2025-01-01");

    for (let d = 0; d < 365; d++) {
      const day = addDays(cryptoStart, d);
      for (const sym of cryptoSymbols) {
        const drift = 1 + (d / 365) * 0.5 * (Math.random() > 0.5 ? 1 : -0.3);
        const noise = 1 + (Math.random() - 0.5) * 0.05;
        const price = (basePrices[sym] * drift * noise).toFixed(2);
        const volume = (rand(1e8, 5e9)).toFixed(2);
        const change = (rand(-8, 8)).toFixed(4);
        cryptoValues.push(`('${day.toISOString()}', '${sym}', ${price}, ${volume}, ${change})`);
      }
    }

    for (let i = 0; i < cryptoValues.length; i += BATCH) {
      const batch = cryptoValues.slice(i, i + BATCH);
      await prisma.$executeRawUnsafe(
        `INSERT INTO ts_crypto_prices (time, symbol, price, volume, change_24h) VALUES ${batch.join(",")}`
      );
    }
    console.log(`  Inserted ${cryptoValues.length} crypto price rows`);
  } catch {
    console.log("  Skipped ts_crypto_prices (TimescaleDB not available)");
  }

  // ── TimescaleDB: GitHub Activity (180 days, optional) ──
  try {
    const repos = ["finpulse/frontend", "finpulse/backend", "finpulse/infra"];
    const ghValues: string[] = [];

    for (let d = 0; d < 180; d++) {
      const day = addDays(new Date("2025-06-01"), d);
      for (const repo of repos) {
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        const commits = isWeekend ? randInt(0, 3) : randInt(2, 15);
        const prs = isWeekend ? randInt(0, 1) : randInt(0, 5);
        const issues = randInt(0, 3);
        ghValues.push(`('${day.toISOString()}', '${repo}', ${commits}, ${prs}, ${issues}, 0)`);
      }
    }

    for (let i = 0; i < ghValues.length; i += BATCH) {
      const batch = ghValues.slice(i, i + BATCH);
      await prisma.$executeRawUnsafe(
        `INSERT INTO ts_github_activity (time, repo, commits, pull_requests, issues, stars) VALUES ${batch.join(",")}`
      );
    }
    console.log(`  Inserted ${ghValues.length} GitHub activity rows`);
  } catch {
    console.log("  Skipped ts_github_activity (TimescaleDB not available)");
  }

  // ── Star Schema: Dimensions (optional) ──
  console.log("\n  Populating star schema...");
  try {

  // dim_user
  for (const u of users) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO dim_user (user_id, email, first_name, last_name, role, is_active, effective_from) VALUES ('${u.id}', '${u.email}', '${u.firstName}', '${u.lastName}', '${u.role}', ${u.isActive}, '2024-01-01') ON CONFLICT DO NOTHING`
    );
  }
  console.log(`  Populated dim_user`);

  // dim_category
  for (const [slug, id] of Object.entries(categoryIds)) {
    const cat = CATEGORIES.find((c) => c.slug === slug) || CATEGORIES.flatMap((c) => c.children || []).find((c) => c.slug === slug);
    if (cat) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO dim_category (category_id, name, slug, color, effective_from) VALUES ('${id}', '${cat.name}', '${cat.slug}', '${cat.color}', '2024-01-01') ON CONFLICT DO NOTHING`
      );
    }
  }
  console.log(`  Populated dim_category`);

  // dim_account
  for (const a of accounts) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO dim_account (account_id, account_number, type, currency, status, effective_from) VALUES ('${a.id}', '${a.accountNumber}', '${a.type}', '${a.currency}', '${a.status}', '2024-01-01') ON CONFLICT DO NOTHING`
    );
  }
  console.log(`  Populated dim_account`);

  // ── Fact Tables ──
  // fact_transactions
  const factBatches: string[] = [];
  for (const tx of transactions) {
    const dk = formatDateKey(tx.occurredAt);
    const isFlagged = tx.amount > 5000;
    factBatches.push(
      `('${tx.id}', ${dk}, (SELECT user_key FROM dim_user WHERE user_id = (SELECT "userId" FROM accounts WHERE id = '${tx.fromAccountId}') AND is_current LIMIT 1), (SELECT account_key FROM dim_account WHERE account_id = '${tx.fromAccountId}' AND is_current LIMIT 1), ${tx.toAccountId ? `(SELECT account_key FROM dim_account WHERE account_id = '${tx.toAccountId}' AND is_current LIMIT 1)` : "NULL"}, ${tx.categoryId ? `(SELECT category_key FROM dim_category WHERE category_id = '${tx.categoryId}' AND is_current LIMIT 1)` : "NULL"}, '${tx.type}', '${tx.status}', ${tx.amount}, ${isFlagged}, '${tx.occurredAt.toISOString()}')`
    );
  }

  // Insert fact_transactions in batches
  for (let i = 0; i < factBatches.length; i += 200) {
    const batch = factBatches.slice(i, i + 200);
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO fact_transactions (transaction_key, date_key, user_key, from_account_key, to_account_key, category_key, tx_type, tx_status, amount, is_flagged, occurred_at) VALUES ${batch.join(",")} ON CONFLICT DO NOTHING`
      );
    } catch {
      // Silently skip batches with reference issues
    }
  }
  console.log(`  Populated fact_transactions`);

  // fact_monthly_kpi (24 months)
  for (let m = 0; m < 24; m++) {
    const kpiDate = new Date(2024, m, 1);
    const dk = formatDateKey(kpiDate);
    const growthFactor = 1 + m * 0.02;
    const revenue = parseFloat((rand(80000, 120000) * growthFactor).toFixed(2));
    const expenses = parseFloat((revenue * rand(0.55, 0.75)).toFixed(2));
    const profit = parseFloat((revenue - expenses).toFixed(2));
    const activeUsers = Math.round(30 + m * 1.5 + rand(-2, 2));
    const newUsers = randInt(1, 5);
    const arpu = parseFloat((revenue / activeUsers).toFixed(2));
    const ltv = parseFloat((arpu * rand(12, 24)).toFixed(2));
    const cac = parseFloat(rand(50, 200).toFixed(2));
    const growthRate = parseFloat((rand(1, 8)).toFixed(4));
    const retentionRate = parseFloat(rand(0.85, 0.96).toFixed(4));
    const churnRate = parseFloat((1 - retentionRate).toFixed(4));
    const profitMargin = parseFloat((profit / revenue).toFixed(4));

    await prisma.$executeRawUnsafe(
      `INSERT INTO fact_monthly_kpi (date_key, revenue, expenses, profit, active_users, new_users, arpu, ltv, cac, growth_rate, retention_rate, churn_rate, profit_margin) VALUES (${dk}, ${revenue}, ${expenses}, ${profit}, ${activeUsers}, ${newUsers}, ${arpu}, ${ltv}, ${cac}, ${growthRate}, ${retentionRate}, ${churnRate}, ${profitMargin}) ON CONFLICT (date_key) DO NOTHING`
    );
  }
  console.log(`  Populated fact_monthly_kpi (24 months)`);
  } catch {
    console.log("  Skipped star schema (tables not available)");
  }

  // ── Refresh continuous aggregates ──
  try {
    await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW ts_tx_hourly`);
    await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW ts_tx_daily`);
    console.log("  Refreshed continuous aggregates");
  } catch {
    console.log("  Skipped continuous aggregate refresh (TimescaleDB not available)");
  }

  console.log("\n✅ Seed complete!");
  console.log(`   ${users.length} users | ${accounts.length} accounts | ${transactions.length} transactions`);
  console.log(`   ${riskFlags.length} risk flags | ${auditLogs.length} audit logs`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
