# FinPulse

**An enterprise financial management platform with ERP-grade accounting, real-time analytics, risk monitoring, and regulatory compliance** — double-entry GL, AP/AR, budgets, financial statements, anomaly detection, and a full audit trail.

Built to demonstrate the ability to architect production-grade fintech software: multi-entity accounting, 8-role RBAC with granular permissions, immutable audit logging, and 35 interconnected data models across a unified financial platform.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_App-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://finpulse-ten.vercel.app)
[![GitHub](https://img.shields.io/badge/Source_Code-GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/adeleke-taiwo/FinPulse)

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![NextAuth](https://img.shields.io/badge/NextAuth_v5-black?style=flat-square&logo=JSON%20web%20tokens)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

> **[Try it live](https://finpulse-ten.vercel.app)** — demo accounts with click-to-fill are available on the login page.

---

## Screenshots

| | |
|:---:|:---:|
| ![Login](docs/screenshots/login.png) | ![Dashboard](docs/screenshots/dashboard.png) |
| **Login** — Demo accounts with click-to-fill for all 6 roles | **Dashboard** — KPI cards, revenue trends, cash flow, recent transactions |
| ![Executive](docs/screenshots/executive.png) | ![General Ledger](docs/screenshots/general-ledger.png) |
| **Executive Dashboard** — Consolidated P&L, cash position, financial ratios | **General Ledger** — Chart of accounts with drill-down into GL activity |
| ![Journal](docs/screenshots/journal.png) | ![Analytics](docs/screenshots/analytics.png) |
| **Journal Entries** — Double-entry ledger with approval workflow statuses | **Revenue Analytics** — Trend analysis with daily/weekly/monthly granularity |
| ![Transactions](docs/screenshots/transactions.png) | ![Risk](docs/screenshots/risk.png) |
| **Transactions** — Real-time SSE feed, filtering, sorting, CSV export | **Risk Monitoring** — Severity distribution, monthly trend, anomaly detection |
| ![Expenses](docs/screenshots/expenses.png) | |
| **Expense Management** — Multi-category tracking with department & cost center | |

---

## What This Project Demonstrates

| Skill Area | Implementation |
|:-----------|:---------------|
| **Full-Stack Architecture** | Next.js 16 App Router with 44 API routes, 60 pages, and 33 reusable components |
| **ERP Domain Modelling** | Double-entry accounting (GL, AP, AR), fiscal periods, trial balance, financial statements |
| **Authentication** | NextAuth v5 with JWT strategy, credential-based login, and session management |
| **Authorization** | 8 organizational roles with granular module-level permissions (view, create, edit, delete, approve, export) |
| **Database Design** | 35 Prisma models with 21 enums, referential integrity, and Decimal precision for financial data |
| **Security** | Parameterized SQL, Zod validation, audit logging, org-level data isolation |
| **Real-Time Data** | Server-Sent Events for live transaction feed, auto-refresh polling for KPI dashboards |
| **Production Deployment** | Vercel (serverless) + Neon PostgreSQL (serverless pooling) with zero-downtime deploys |

---

## Key Features

### Accounting & Finance (ERP)
- **General Ledger** — Chart of accounts with drill-down into individual GL account activity
- **Journal Entries** — Double-entry with debit/credit line editor and approval workflow (Draft → Pending → Approved → Posted)
- **Accounts Payable** — Vendor management, purchase invoices, tax calculation, payment processing
- **Accounts Receivable** — Customer management, sales invoices, aging reports, payment tracking
- **Budgets & Statements** — Department-level budgets with GL line items, auto-generated income statement, balance sheet, trial balance, and forecasting

### Analytics, Risk & Compliance
- **KPI Dashboard** — Revenue, expenses, profit margins, cash flow with auto-refresh polling
- **Revenue Analytics** — Trend analysis with daily/weekly/monthly granularity and category breakdown
- **Anomaly Detection** — Automated flagging of unusual financial patterns
- **Risk Monitoring** — Transaction risk scoring with severity distribution and drill-down
- **SOX Compliance** — Sarbanes-Oxley control tracking, segregation of duties, immutable audit log

### Administration
- **8 Organizational Roles** — Super Admin, CFO, Finance Manager, Department Head, Analyst, Employee, Auditor, External Accountant
- **Granular Permissions** — Module-level access control enforced at the API layer via `requirePermission(module, action)`
- **Multi-Entity Support** — Multi-subsidiary organizations with separate entities
- **Workflow Engine** — Visual approval workflow designer with step conditions

---

## Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| **Framework** | Next.js 16 (App Router) | Full-stack React with serverless API routes |
| **Frontend** | React 19 + TypeScript 5.9 | Component-based UI with type safety |
| **Styling** | Tailwind CSS 4 + Radix UI | Utility-first design with accessible primitives |
| **Charts** | Recharts 3 | Interactive financial visualisations |
| **Auth** | NextAuth v5 (JWT + Credentials) | Session management with role-aware tokens |
| **Database** | Neon PostgreSQL (serverless) | Serverless Postgres with connection pooling |
| **ORM** | Prisma 6 | Type-safe queries with Decimal precision for financial data |
| **Validation** | Zod 4 | Schema validation on API inputs |
| **Deployment** | Vercel | Zero-config Next.js hosting |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   Next.js 16 App Router                      │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│  │  60 Pages   │  │ 33 Comps    │  │   Client State       │ │
│  │ (dashboard) │  │ UI + Charts │  │   React hooks        │ │
│  └──────┬──────┘  └─────────────┘  └──────────┬───────────┘ │
│         │                                      │             │
│─────────┼──────────────────────────────────────┼─────────────│
│         │         API Routes (/api/)           │             │
│  ┌──────┴──────┐  ┌─────────────┐  ┌──────────┴───────────┐ │
│  │  44 Routes  │──│  Services   │  │    Middleware         │ │
│  │             │  │  + GL Engine│  │ Auth · RBAC · Audit   │ │
│  └─────────────┘  └──────┬──────┘  │ Zod · Org Isolation  │ │
│                          │         └──────────────────────┘ │
└──────────────────────────┼──────────────────────────────────┘
                           │  Prisma 6
                           ▼
                 ┌──────────────────────┐
                 │  Neon PostgreSQL     │
                 │ 35 models · 21 enums │
                 └──────────────────────┘
```

```
src/
├── app/
│   ├── (auth)/              # Login & registration
│   ├── (dashboard)/         # 58 authenticated pages
│   │   ├── admin/           #   Organization, Members, Roles, Departments, Workflows
│   │   ├── finance/         #   GL, AP, AR, Budgets, Journal, Statements, Periods
│   │   ├── compliance/      #   SOX, Segregation of Duties
│   │   ├── expenses/        #   Submit, Track, Approve
│   │   ├── executive/       #   C-suite dashboard
│   │   ├── risk/            #   Risk monitoring
│   │   ├── transactions/    #   Transaction browser & detail
│   │   └── ...              #   Reports, Integrations, Data Sources, Settings
│   └── api/                 # 44 REST endpoints
├── components/              # 33 reusable components (UI, charts, finance, layout)
├── lib/
│   ├── auth/                # NextAuth config, permissions engine, org resolver
│   ├── finance/             # GL engine, financial calculations
│   ├── db/                  # Prisma client, raw query helpers
│   └── utils.ts             # Shared utilities
└── prisma/
    ├── schema.prisma        # 35 models, 21 enums
    ├── seed-erp.ts          # ERP data seeder (GL accounts, vendors, customers)
    └── migrations/          # Version-controlled schema migrations
```

---

## API Endpoints (44 routes)

| Endpoint | Purpose | Access |
|:---------|:--------|:-------|
| `POST /api/auth/*` | Register, login, session management | Public |
| `GET /api/dashboard` | KPI metrics, recent transactions, sparklines | All roles |
| `GET/POST /api/transactions/*` | Browse, create, SSE live feed, CSV export | All (export: Analyst+) |
| `GET/POST /api/finance/gl` | Chart of accounts, GL account activity | Finance roles |
| `GET/POST /api/finance/journal` | Journal entries with line items | Finance roles |
| `GET/POST /api/finance/{invoices,customer-invoices}` | AP & AR invoices with vendor/customer validation | Finance roles |
| `GET/POST /api/finance/{vendors,customers}` | Vendor and customer management | Finance roles |
| `GET/POST /api/finance/budgets` | Department budgets with GL line items | Finance roles |
| `GET /api/finance/{statements,trial-balance,aging,forecasting}` | Financial reports and projections | Finance roles |
| `GET /api/analytics/*` | Revenue trends, KPIs, cohorts, anomalies | Analyst+ |
| `GET /api/risk` | Risk scores, severity distribution | Analyst+ |
| `GET/POST /api/expenses` | Expense submission and tracking | All roles |
| `GET /api/approvals` | Multi-step approval queue | Manager+ |
| `GET/POST /api/reports` | Report templates and saved reports | Analyst+ |
| `GET /api/audit-log` | Immutable activity log | Admin |
| `GET/POST /api/admin/*` | Organization, members, roles, departments | Admin |
| `POST /api/upload` | CSV data import with mapping | Admin |

### Permission System

API-level enforcement via `requirePermission(module, action)`:

| Module | Available Actions |
|:-------|:------------------|
| `gl`, `budgets`, `ap`, `ar` | view, create, edit, delete, approve |
| `transactions`, `expenses` | view, create, edit, export |
| `analytics`, `reports` | view, export |
| `compliance`, `risk` | view, manage |
| `admin` | view, manage, delete |

---

## Security Highlights

- **Parameterized SQL** — all raw queries use positional parameters (`$1, $2`); no string interpolation in SQL
- **Organization isolation** — every data-mutating endpoint validates resource ownership against the user's organization
- **Permission enforcement** — centralized `requirePermission(module, action)` on all API routes
- **Audit logging** — every sensitive mutation logged with actor ID, action, resource, and timestamp
- **Input validation** — Zod schemas reject malformed requests before they reach business logic

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or [Neon](https://neon.tech) serverless)

### Installation

```bash
# Clone
git clone https://github.com/adeleke-taiwo/FinPulse.git
cd FinPulse

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL in .env

# Run database migrations and seed demo data
npm run db:setup

# Seed ERP data (GL accounts, vendors, customers, invoices)
npm run db:seed-erp

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with a demo account from the login page.

---

## About Me

I'm a full-stack developer who builds clean, production-ready applications with modern technologies. This project demonstrates my ability to architect and deliver complex financial software end-to-end — from ERP-grade database design and secure API development through to responsive frontend implementation.

**Looking for opportunities** to contribute to impactful products with a collaborative team.

- GitHub: [@adeleke-taiwo](https://github.com/adeleke-taiwo)

---

## License

This project is open source and available under the [MIT License](LICENSE).
