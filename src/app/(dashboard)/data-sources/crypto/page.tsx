"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface CryptoData {
  prices: { time: string; price: number; volume: number; change_24h: number }[];
  latest: { symbol: string; price: number; change_24h: number; volume: number }[];
}

const SYMBOL_COLORS: Record<string, string> = {
  BTC: "var(--chart-4)",
  ETH: "var(--chart-1)",
  SOL: "var(--chart-5)",
};

export default function CryptoPage() {
  const [data, setData] = useState<CryptoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [days, setDays] = useState(30);

  useEffect(() => {
    let active = true;
    fetch(`/api/data-sources/crypto?symbol=${selectedSymbol}&days=${days}`)
      .then(async (res) => {
        if (!active) return;
        if (res.ok) setData(await res.json());
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [selectedSymbol, days]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Crypto Prices</h1>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Crypto Prices</h1>
        <div className="flex gap-2">
          {[7, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Price Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {data.latest.map((coin) => (
          <Card
            key={coin.symbol}
            className={`cursor-pointer transition-shadow hover:shadow-md ${
              selectedSymbol === coin.symbol ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedSymbol(coin.symbol)}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-foreground">{coin.symbol}</span>
              <span
                className={`text-xs font-medium ${
                  coin.change_24h >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {formatPercent(coin.change_24h)}
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {formatCurrency(coin.price)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vol: ${(coin.volume / 1e9).toFixed(1)}B
            </p>
          </Card>
        ))}
      </div>

      {/* Price Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{selectedSymbol} Price ({days}D)</CardTitle>
        </CardHeader>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.prices} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SYMBOL_COLORS[selectedSymbol]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={SYMBOL_COLORS[selectedSymbol]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en", { month: "short", day: "numeric" })}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) => `$${v.toLocaleString()}`}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                formatter={(v) => [formatCurrency(Number(v)), "Price"]}
                labelFormatter={(l) => new Date(l).toLocaleDateString()}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={SYMBOL_COLORS[selectedSymbol]}
                fill="url(#priceGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Volume</CardTitle>
        </CardHeader>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.prices} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en", { month: "short", day: "numeric" })}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) => `$${(v / 1e9).toFixed(1)}B`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                formatter={(v) => [`$${(Number(v) / 1e9).toFixed(2)}B`, "Volume"]}
              />
              <Line type="monotone" dataKey="volume" stroke="var(--chart-3)" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
