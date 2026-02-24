"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GitCommit, GitPullRequest, CircleDot } from "lucide-react";

interface GitHubData {
  activity: { time: string; repo: string; commits: number; pull_requests: number; issues: number }[];
  summary: { repo: string; total_commits: number; total_prs: number; total_issues: number }[];
}

export default function GitHubPage() {
  const [data, setData] = useState<GitHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let active = true;
    fetch(`/api/data-sources/github?days=${days}`)
      .then(async (res) => {
        if (!active) return;
        if (res.ok) setData(await res.json());
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [days]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">GitHub Activity</h1>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  // Aggregate daily across all repos
  const dailyMap: Record<string, { date: string; commits: number; prs: number; issues: number }> = {};
  for (const row of data.activity) {
    const date = row.time.split("T")[0];
    if (!dailyMap[date]) dailyMap[date] = { date, commits: 0, prs: 0, issues: 0 };
    dailyMap[date].commits += row.commits;
    dailyMap[date].prs += row.pull_requests;
    dailyMap[date].issues += row.issues;
  }
  const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">GitHub Activity</h1>
        <div className="flex gap-2">
          {[7, 30, 90, 180].map((d) => (
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

      {/* Repo Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {data.summary.map((repo) => (
          <Card key={repo.repo}>
            <p className="mb-2 text-sm font-medium text-foreground">{repo.repo}</p>
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <GitCommit className="h-3 w-3 text-chart-1" />
                <span className="text-sm font-bold text-foreground">{repo.total_commits}</span>
                <span className="text-xs text-muted-foreground">commits</span>
              </div>
              <div className="flex items-center gap-1">
                <GitPullRequest className="h-3 w-3 text-chart-5" />
                <span className="text-sm font-bold text-foreground">{repo.total_prs}</span>
                <span className="text-xs text-muted-foreground">PRs</span>
              </div>
              <div className="flex items-center gap-1">
                <CircleDot className="h-3 w-3 text-chart-4" />
                <span className="text-sm font-bold text-foreground">{repo.total_issues}</span>
                <span className="text-xs text-muted-foreground">issues</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Commits Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Commits</CardTitle>
        </CardHeader>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }} />
              <Bar dataKey="commits" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* PRs & Issues Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Pull Requests & Issues</CardTitle>
        </CardHeader>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="prs" stroke="var(--chart-5)" strokeWidth={2} name="Pull Requests" />
              <Line type="monotone" dataKey="issues" stroke="var(--chart-4)" strokeWidth={2} name="Issues" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
