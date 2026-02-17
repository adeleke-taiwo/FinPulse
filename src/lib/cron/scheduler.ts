import cron from "node-cron";
import {
  fetchCryptoPrices,
  scanAnomalies,
  refreshAggregates,
  dailyAggregation,
  syncGitHubActivity,
  monthlyKPISnapshot,
  generateSimulatedTransactions,
} from "./jobs";

let initialized = false;

export function initScheduler() {
  if (initialized) return;
  initialized = true;

  console.log("[SCHEDULER] Initializing CRON jobs...");

  // Every 15 min: crypto price fetch
  cron.schedule("*/15 * * * *", () => {
    fetchCryptoPrices().catch(console.error);
  });

  // Every 30 min: anomaly scan
  cron.schedule("*/30 * * * *", () => {
    scanAnomalies().catch(console.error);
  });

  // Hourly: refresh continuous aggregates
  cron.schedule("0 * * * *", () => {
    refreshAggregates().catch(console.error);
  });

  // Daily at 1 AM: full aggregation
  cron.schedule("0 1 * * *", () => {
    dailyAggregation().catch(console.error);
  });

  // Every 6 hours: GitHub activity sync
  cron.schedule("0 */6 * * *", () => {
    syncGitHubActivity().catch(console.error);
  });

  // Monthly on 1st at 2 AM: KPI snapshot
  cron.schedule("0 2 1 * *", () => {
    monthlyKPISnapshot().catch(console.error);
  });

  // Every 2 hours: simulated transaction generator (keeps demo data fresh)
  cron.schedule("0 */2 * * *", () => {
    generateSimulatedTransactions().catch(console.error);
  });

  console.log("[SCHEDULER] All CRON jobs scheduled");
}
