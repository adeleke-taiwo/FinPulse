import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateForecast } from "@/lib/analytics/forecasting";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate mock historical monthly revenue data (past 12 months)
    const now = new Date();
    const historicalData: { period: string; value: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });

      // Simulated revenue with growth trend and seasonal variation
      const baseRevenue = 120000;
      const growthFactor = 1 + (12 - i) * 0.02;
      const seasonalFactor = 1 + 0.1 * Math.sin((date.getMonth() / 12) * 2 * Math.PI);
      const noise = 0.95 + Math.random() * 0.1;
      const value = Math.round(baseRevenue * growthFactor * seasonalFactor * noise);

      historicalData.push({ period: monthLabel, value });
    }

    // Generate forecast labels for the next 6 months
    const periodLabels: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      periodLabels.push(
        date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        })
      );
    }

    const forecast = generateForecast(historicalData, 6, periodLabels);

    return NextResponse.json({
      data: forecast,
      metadata: {
        historicalPeriods: 12,
        forecastPeriods: 6,
        model: "linear_regression",
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Forecasting API error:", error);
    return NextResponse.json(
      { error: "Failed to generate forecast" },
      { status: 500 }
    );
  }
}
