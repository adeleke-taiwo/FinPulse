import { NextRequest, NextResponse } from "next/server";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";

// Note: ts_github_activity table was a legacy TimescaleDB artifact.
// Returns simulated data for demo purposes.
export async function GET(request: NextRequest) {
  try {
    const authResult = await requirePermission("integrations", "view");
    if (isAuthError(authResult)) return authResult;
    const { searchParams } = request.nextUrl;
    const days = parseInt(searchParams.get("days") || "30");

    const repos = ["finpulse/frontend", "finpulse/backend", "finpulse/infra"];
    const now = new Date();

    // Generate simulated activity data
    const activity: { time: string; repo: string; commits: number; pull_requests: number; issues: number }[] = [];
    for (let d = days; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString();

      for (const repo of repos) {
        activity.push({
          time: dateStr,
          repo,
          commits: Math.floor(Math.random() * 15) + 1,
          pull_requests: Math.floor(Math.random() * 5),
          issues: Math.floor(Math.random() * 3),
        });
      }
    }

    const summary = repos.map((repo) => {
      const repoActivity = activity.filter((a) => a.repo === repo);
      return {
        repo,
        total_commits: repoActivity.reduce((s, a) => s + a.commits, 0),
        total_prs: repoActivity.reduce((s, a) => s + a.pull_requests, 0),
        total_issues: repoActivity.reduce((s, a) => s + a.issues, 0),
      };
    });

    return NextResponse.json({ activity, summary });
  } catch (error) {
    console.error("GitHub API error:", error);
    return NextResponse.json({ error: "Failed to fetch GitHub data" }, { status: 500 });
  }
}
