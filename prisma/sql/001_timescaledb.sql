-- Time-series tables (standard Postgres — TimescaleDB optional)
-- If TimescaleDB is available, uncomment the hypertable lines.

-- Transaction metrics
CREATE TABLE IF NOT EXISTS ts_transaction_metrics (
  time         TIMESTAMPTZ NOT NULL,
  account_id   UUID,
  category_id  UUID,
  tx_type      TEXT NOT NULL,
  amount       DECIMAL(15,2) NOT NULL,
  tx_count     INT DEFAULT 1,
  is_flagged   BOOLEAN DEFAULT FALSE
);

-- Materialized view: hourly rollup
CREATE MATERIALIZED VIEW IF NOT EXISTS ts_tx_hourly AS
SELECT
  DATE_TRUNC('hour', time) AS bucket,
  tx_type,
  category_id,
  SUM(amount) AS total_amount,
  SUM(tx_count) AS total_count,
  COUNT(*) FILTER (WHERE is_flagged) AS flagged_count
FROM ts_transaction_metrics
GROUP BY DATE_TRUNC('hour', time), tx_type, category_id
WITH NO DATA;

-- Materialized view: daily rollup
CREATE MATERIALIZED VIEW IF NOT EXISTS ts_tx_daily AS
SELECT
  DATE_TRUNC('day', time) AS bucket,
  tx_type,
  category_id,
  SUM(amount) AS total_amount,
  SUM(tx_count) AS total_count,
  COUNT(*) FILTER (WHERE is_flagged) AS flagged_count
FROM ts_transaction_metrics
GROUP BY DATE_TRUNC('day', time), tx_type, category_id
WITH NO DATA;

-- Crypto prices
CREATE TABLE IF NOT EXISTS ts_crypto_prices (
  time       TIMESTAMPTZ NOT NULL,
  symbol     TEXT NOT NULL,
  price      DECIMAL(15,2) NOT NULL,
  volume     DECIMAL(20,2) DEFAULT 0,
  market_cap DECIMAL(20,2) DEFAULT 0,
  change_24h DECIMAL(8,4) DEFAULT 0
);

-- GitHub activity
CREATE TABLE IF NOT EXISTS ts_github_activity (
  time          TIMESTAMPTZ NOT NULL,
  repo          TEXT NOT NULL,
  commits       INT DEFAULT 0,
  pull_requests INT DEFAULT 0,
  issues        INT DEFAULT 0,
  stars         INT DEFAULT 0
);

-- Analytics snapshots
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  time        TIMESTAMPTZ NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(20,4) NOT NULL,
  dimensions  JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ts_tx_metrics_type ON ts_transaction_metrics (tx_type, time DESC);
CREATE INDEX IF NOT EXISTS idx_ts_tx_metrics_category ON ts_transaction_metrics (category_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_ts_crypto_symbol ON ts_crypto_prices (symbol, time DESC);
CREATE INDEX IF NOT EXISTS idx_ts_github_repo ON ts_github_activity (repo, time DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_metric ON analytics_snapshots (metric_name, time DESC);
