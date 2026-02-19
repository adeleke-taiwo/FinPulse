import { prisma } from "./index";

export async function rawQuery<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  return prisma.$queryRawUnsafe<T[]>(sql, ...params);
}

export async function rawExecute(
  sql: string,
  params: unknown[] = []
): Promise<number> {
  return prisma.$executeRawUnsafe(sql, ...params);
}

export async function insertTimescaleMetric(data: {
  time: Date;
  accountId?: string;
  categoryId?: string;
  txType: string;
  amount: number;
  txCount?: number;
  isFlagged?: boolean;
}): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO ts_transaction_metrics (time, account_id, category_id, tx_type, amount, tx_count, is_flagged)
     VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7)`,
    data.time,
    data.accountId || null,
    data.categoryId || null,
    data.txType,
    data.amount,
    data.txCount ?? 1,
    data.isFlagged ?? false
  );
}

export async function getTimeSeriesData(
  granularity: "hourly" | "daily",
  startDate: Date,
  endDate: Date,
  txType?: string
) {
  const view = granularity === "hourly" ? "ts_tx_hourly" : "ts_tx_daily";
  const typeFilter = txType ? "AND tx_type = $3" : "";
  const params: unknown[] = [startDate, endDate];
  if (txType) params.push(txType);

  return rawQuery<{
    bucket: Date;
    tx_type: string;
    total_amount: number;
    total_count: number;
    flagged_count: number;
  }>(
    `SELECT bucket, tx_type, total_amount::float, total_count::int, flagged_count::int
     FROM ${view}
     WHERE bucket >= $1 AND bucket <= $2 ${typeFilter}
     ORDER BY bucket ASC`,
    params
  );
}

export async function getCryptoPrices(
  symbol: string,
  startDate: Date,
  endDate: Date
) {
  return rawQuery<{
    time: Date;
    symbol: string;
    price: number;
    volume: number;
    change_24h: number;
  }>(
    `SELECT time, symbol, price::float, volume::float, change_24h::float
     FROM ts_crypto_prices
     WHERE symbol = $1 AND time >= $2 AND time <= $3
     ORDER BY time ASC`,
    [symbol, startDate, endDate]
  );
}

export async function getGitHubActivity(
  startDate: Date,
  endDate: Date,
  repo?: string
) {
  const repoFilter = repo ? "AND repo = $3" : "";
  const params: unknown[] = [startDate, endDate];
  if (repo) params.push(repo);

  return rawQuery<{
    time: Date;
    repo: string;
    commits: number;
    pull_requests: number;
    issues: number;
  }>(
    `SELECT time, repo, commits, pull_requests, issues
     FROM ts_github_activity
     WHERE time >= $1 AND time <= $2 ${repoFilter}
     ORDER BY time ASC`,
    params
  );
}
