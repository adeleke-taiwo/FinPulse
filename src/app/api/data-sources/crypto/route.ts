import { NextRequest, NextResponse } from "next/server";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";

// Note: ts_crypto_prices table was a legacy TimescaleDB artifact.
// Returns simulated data for demo purposes.
export async function GET(request: NextRequest) {
  try {
    const authResult = await requirePermission("integrations", "view");
    if (isAuthError(authResult)) return authResult;
    const { searchParams } = request.nextUrl;
    const symbol = searchParams.get("symbol") || "BTC";
    const days = parseInt(searchParams.get("days") || "30");

    const now = new Date();
    const basePrices: Record<string, number> = { BTC: 62000, ETH: 3400, SOL: 145 };
    const base = basePrices[symbol] || 100;

    // Generate simulated price data
    const prices = [];
    let price = base;
    for (let d = days; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      price = price * (1 + (Math.random() - 0.48) * 0.04); // slight upward drift
      prices.push({
        time: date.toISOString(),
        price: parseFloat(price.toFixed(2)),
        volume: parseFloat((Math.random() * 1e9 + 5e8).toFixed(0)),
        change_24h: parseFloat(((Math.random() - 0.5) * 8).toFixed(2)),
      });
    }

    const latest = Object.entries(basePrices).map(([sym, basePrice]) => ({
      symbol: sym,
      price: parseFloat((basePrice * (1 + (Math.random() - 0.5) * 0.05)).toFixed(2)),
      change_24h: parseFloat(((Math.random() - 0.5) * 6).toFixed(2)),
      volume: parseFloat((Math.random() * 2e9 + 1e9).toFixed(0)),
    }));

    return NextResponse.json({ prices, latest });
  } catch (error) {
    console.error("Crypto API error:", error);
    return NextResponse.json({ error: "Failed to fetch crypto data" }, { status: 500 });
  }
}
