import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function generateAccountNumber(): string {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("");
}

export function maskPII(value: string): string {
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    return `${local[0]}***@${domain}`;
  }
  if (value.length > 4) {
    return `***${value.slice(-4)}`;
  }
  return "****";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Convert DATABASE_ENUM_VALUE to Title Case (e.g. "PENDING_APPROVAL" → "Pending Approval") */
export function toTitleCase(str: unknown): string {
  if (typeof str !== "string" || !str) return "";
  return str
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
}
