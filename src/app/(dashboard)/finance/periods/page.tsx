"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, Lock, Unlock, AlertCircle } from "lucide-react";

interface FiscalPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  closedById: string | null;
  closedAt: string | null;
  closedBy?: { firstName: string; lastName: string } | null;
}

export default function FiscalPeriodsPage() {
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPeriods = useCallback(async () => {
    try {
      // Attempt to fetch from an API endpoint
      // If not available, use mock data
      const res = await fetch("/api/finance/periods");
      if (res.ok) {
        const json = await res.json();
        setPeriods(json.data || []);
      } else {
        // Use representative mock data
        loadMockData();
      }
    } catch {
      loadMockData();
    } finally {
      setLoading(false);
    }
  }, []);

  function loadMockData() {
    const year = new Date().getFullYear();
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const currentMonth = new Date().getMonth();

    const mockPeriods: FiscalPeriod[] = months.map((m, i) => ({
      id: `fp-${i + 1}`,
      name: `${m} ${year}`,
      startDate: new Date(year, i, 1).toISOString(),
      endDate: new Date(year, i + 1, 0).toISOString(),
      isClosed: i < currentMonth - 1,
      closedById: i < currentMonth - 1 ? "user-1" : null,
      closedAt: i < currentMonth - 1 ? new Date(year, i + 1, 5).toISOString() : null,
      closedBy: i < currentMonth - 1 ? { firstName: "Admin", lastName: "User" } : null,
    }));

    setPeriods(mockPeriods);
  }

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  function isCurrentPeriod(period: FiscalPeriod): boolean {
    const now = new Date();
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    return now >= start && now <= end;
  }

  async function handleTogglePeriod(period: FiscalPeriod) {
    setActionLoading(period.id);
    // In a real implementation, this would call an API
    // For now, toggle locally
    setPeriods((prev) =>
      prev.map((p) =>
        p.id === period.id
          ? {
              ...p,
              isClosed: !p.isClosed,
              closedAt: !p.isClosed ? new Date().toISOString() : null,
              closedBy: !p.isClosed ? { firstName: "Current", lastName: "User" } : null,
            }
          : p
      )
    );
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fiscal Periods</h1>
            <p className="text-sm text-muted-foreground">Manage accounting periods</p>
          </div>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const openPeriods = periods.filter((p) => !p.isClosed);
  const closedPeriods = periods.filter((p) => p.isClosed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fiscal Periods</h1>
          <p className="text-sm text-muted-foreground">
            {openPeriods.length} open, {closedPeriods.length} closed
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Unlock className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{openPeriods.length}</p>
              <p className="text-xs text-muted-foreground">Open Periods</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{closedPeriods.length}</p>
              <p className="text-xs text-muted-foreground">Closed Periods</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{periods.length}</p>
              <p className="text-xs text-muted-foreground">Total Periods</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Periods table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Period Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {periods.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No fiscal periods configured.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Period</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Start Date</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">End Date</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Closed By</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => {
                    const isCurrent = isCurrentPeriod(period);
                    return (
                      <tr
                        key={period.id}
                        className={`border-b border-border last:border-0 transition-colors ${
                          isCurrent
                            ? "bg-primary/5 hover:bg-primary/10"
                            : "hover:bg-muted/30"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{period.name}</span>
                            {isCurrent && (
                              <Badge variant="default" className="text-[10px]">
                                Current
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(period.startDate), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(period.endDate), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          {period.isClosed ? (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="h-2.5 w-2.5" />
                              Closed
                            </Badge>
                          ) : (
                            <Badge variant="success" className="gap-1">
                              <Unlock className="h-2.5 w-2.5" />
                              Open
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {period.closedBy ? (
                            <div>
                              <span className="text-sm">
                                {period.closedBy.firstName} {period.closedBy.lastName}
                              </span>
                              {period.closedAt && (
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(period.closedAt), "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                          ) : (
                            "\u2014"
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant={period.isClosed ? "outline" : "default"}
                            onClick={() => handleTogglePeriod(period)}
                            disabled={actionLoading === period.id}
                          >
                            {period.isClosed ? (
                              <>
                                <Unlock className="h-3 w-3" />
                                Reopen
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3" />
                                Close
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning note */}
      <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="text-sm font-medium text-foreground">Period Closure Notice</p>
          <p className="text-xs text-muted-foreground">
            Closing a fiscal period prevents new journal entries from being posted to that period.
            Ensure all entries are reviewed and posted before closing. Reopening a period should
            only be done for corrections and requires appropriate authorization.
          </p>
        </div>
      </div>
    </div>
  );
}
