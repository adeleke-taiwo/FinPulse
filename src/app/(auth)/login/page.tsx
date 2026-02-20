"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DEMO_ACCOUNTS = [
  { label: "Super Admin", email: "admin@acme.io", password: "admin123" },
  { label: "CFO", email: "cfo@acme.io", password: "demo123" },
  { label: "Finance Mgr", email: "finance@acme.io", password: "demo123" },
  { label: "Dept Head", email: "manager@acme.io", password: "demo123" },
  { label: "Employee", email: "employee@acme.io", password: "demo123" },
  { label: "Auditor", email: "auditor@acme.io", password: "demo123" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  function handleDemo(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">FinPulse</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to your analytics dashboard
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </form>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Demo Accounts
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.label}
              onClick={() => handleDemo(acc.email, acc.password)}
              disabled={loading}
              className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
