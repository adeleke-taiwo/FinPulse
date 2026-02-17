-- Star Schema: Dimensional Model

-- Dimension: Date
CREATE TABLE IF NOT EXISTS dim_date (
  date_key     INT PRIMARY KEY,  -- YYYYMMDD
  full_date    DATE NOT NULL UNIQUE,
  year         INT NOT NULL,
  quarter      INT NOT NULL,
  month        INT NOT NULL,
  month_name   TEXT NOT NULL,
  week         INT NOT NULL,
  day          INT NOT NULL,
  day_name     TEXT NOT NULL,
  day_of_week  INT NOT NULL,
  is_weekend   BOOLEAN NOT NULL,
  fiscal_year  INT NOT NULL,
  fiscal_quarter INT NOT NULL
);

-- Dimension: User (SCD Type 2)
CREATE TABLE IF NOT EXISTS dim_user (
  user_key       SERIAL PRIMARY KEY,
  user_id        UUID NOT NULL,
  email          TEXT NOT NULL,
  first_name     TEXT NOT NULL,
  last_name      TEXT NOT NULL,
  role           TEXT NOT NULL,
  is_active      BOOLEAN NOT NULL,
  effective_from DATE NOT NULL,
  effective_to   DATE DEFAULT '9999-12-31',
  is_current     BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_dim_user_current ON dim_user (user_id, is_current) WHERE is_current = TRUE;

-- Dimension: Category (SCD Type 2)
CREATE TABLE IF NOT EXISTS dim_category (
  category_key   SERIAL PRIMARY KEY,
  category_id    UUID NOT NULL,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL,
  parent_name    TEXT,
  color          TEXT,
  effective_from DATE NOT NULL,
  effective_to   DATE DEFAULT '9999-12-31',
  is_current     BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_dim_category_current ON dim_category (category_id, is_current) WHERE is_current = TRUE;

-- Dimension: Account (SCD Type 2)
CREATE TABLE IF NOT EXISTS dim_account (
  account_key    SERIAL PRIMARY KEY,
  account_id     UUID NOT NULL,
  account_number TEXT NOT NULL,
  type           TEXT NOT NULL,
  currency       TEXT NOT NULL,
  status         TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_to   DATE DEFAULT '9999-12-31',
  is_current     BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_dim_account_current ON dim_account (account_id, is_current) WHERE is_current = TRUE;

-- Fact: Transactions
CREATE TABLE IF NOT EXISTS fact_transactions (
  transaction_key UUID PRIMARY KEY,
  date_key        INT NOT NULL REFERENCES dim_date(date_key),
  user_key        INT REFERENCES dim_user(user_key),
  from_account_key INT REFERENCES dim_account(account_key),
  to_account_key  INT REFERENCES dim_account(account_key),
  category_key    INT REFERENCES dim_category(category_key),
  tx_type         TEXT NOT NULL,
  tx_status       TEXT NOT NULL,
  amount          DECIMAL(15,2) NOT NULL,
  is_flagged      BOOLEAN DEFAULT FALSE,
  occurred_at     TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fact_tx_date ON fact_transactions (date_key);
CREATE INDEX IF NOT EXISTS idx_fact_tx_user ON fact_transactions (user_key);
CREATE INDEX IF NOT EXISTS idx_fact_tx_category ON fact_transactions (category_key);

-- Fact: Daily Account Balance
CREATE TABLE IF NOT EXISTS fact_daily_account_balance (
  id           SERIAL PRIMARY KEY,
  date_key     INT NOT NULL REFERENCES dim_date(date_key),
  account_key  INT NOT NULL REFERENCES dim_account(account_key),
  balance      DECIMAL(15,2) NOT NULL,
  change       DECIMAL(15,2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_fact_balance_date ON fact_daily_account_balance (date_key);
CREATE INDEX IF NOT EXISTS idx_fact_balance_account ON fact_daily_account_balance (account_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fact_balance_unique ON fact_daily_account_balance (date_key, account_key);

-- Fact: Monthly KPI
CREATE TABLE IF NOT EXISTS fact_monthly_kpi (
  id              SERIAL PRIMARY KEY,
  date_key        INT NOT NULL REFERENCES dim_date(date_key),
  revenue         DECIMAL(15,2) DEFAULT 0,
  expenses        DECIMAL(15,2) DEFAULT 0,
  profit          DECIMAL(15,2) DEFAULT 0,
  active_users    INT DEFAULT 0,
  new_users       INT DEFAULT 0,
  arpu            DECIMAL(10,2) DEFAULT 0,
  ltv             DECIMAL(10,2) DEFAULT 0,
  cac             DECIMAL(10,2) DEFAULT 0,
  growth_rate     DECIMAL(8,4) DEFAULT 0,
  retention_rate  DECIMAL(8,4) DEFAULT 0,
  churn_rate      DECIMAL(8,4) DEFAULT 0,
  profit_margin   DECIMAL(8,4) DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fact_kpi_date ON fact_monthly_kpi (date_key);

-- Populate dim_date for 2024-01-01 to 2026-12-31
INSERT INTO dim_date (date_key, full_date, year, quarter, month, month_name, week, day, day_name, day_of_week, is_weekend, fiscal_year, fiscal_quarter)
SELECT
  TO_CHAR(d, 'YYYYMMDD')::INT AS date_key,
  d AS full_date,
  EXTRACT(YEAR FROM d)::INT AS year,
  EXTRACT(QUARTER FROM d)::INT AS quarter,
  EXTRACT(MONTH FROM d)::INT AS month,
  TO_CHAR(d, 'Month') AS month_name,
  EXTRACT(WEEK FROM d)::INT AS week,
  EXTRACT(DAY FROM d)::INT AS day,
  TO_CHAR(d, 'Day') AS day_name,
  EXTRACT(DOW FROM d)::INT AS day_of_week,
  EXTRACT(DOW FROM d)::INT IN (0, 6) AS is_weekend,
  CASE WHEN EXTRACT(MONTH FROM d) >= 7 THEN EXTRACT(YEAR FROM d)::INT + 1 ELSE EXTRACT(YEAR FROM d)::INT END AS fiscal_year,
  CASE
    WHEN EXTRACT(MONTH FROM d) BETWEEN 7 AND 9 THEN 1
    WHEN EXTRACT(MONTH FROM d) BETWEEN 10 AND 12 THEN 2
    WHEN EXTRACT(MONTH FROM d) BETWEEN 1 AND 3 THEN 3
    ELSE 4
  END AS fiscal_quarter
FROM generate_series('2024-01-01'::DATE, '2026-12-31'::DATE, '1 day'::INTERVAL) AS d
ON CONFLICT (date_key) DO NOTHING;
