"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Shield,
  Smartphone,
  Globe,
  Key,
  Monitor,
  Trash2,
  Plus,
} from "lucide-react";

interface Session {
  id: string;
  browser: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

export default function SecuritySettingsPage() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: "s1",
      browser: "Chrome 121 on Windows",
      ip: "192.168.1.45",
      lastActive: "2026-02-15T10:30:00Z",
      current: true,
    },
    {
      id: "s2",
      browser: "Safari 17 on macOS",
      ip: "10.0.0.22",
      lastActive: "2026-02-14T18:15:00Z",
      current: false,
    },
    {
      id: "s3",
      browser: "Firefox 122 on Linux",
      ip: "172.16.0.8",
      lastActive: "2026-02-13T09:45:00Z",
      current: false,
    },
  ]);

  const [allowedIPs, setAllowedIPs] = useState<string[]>([
    "192.168.1.0/24",
    "10.0.0.0/16",
  ]);
  const [newIP, setNewIP] = useState("");

  const [minLength, setMinLength] = useState(12);
  const [requireUppercase, setRequireUppercase] = useState(true);
  const [requireNumbers, setRequireNumbers] = useState(true);
  const [requireSpecial, setRequireSpecial] = useState(true);
  const [expiryDays, setExpiryDays] = useState(90);

  function revokeSession(id: string) {
    setSessions(sessions.filter((s) => s.id !== id));
  }

  function addIP() {
    if (newIP && !allowedIPs.includes(newIP)) {
      setAllowedIPs([...allowedIPs, newIP]);
      setNewIP("");
    }
  }

  function removeIP(ip: string) {
    setAllowedIPs(allowedIPs.filter((i) => i !== ip));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Security Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage authentication, sessions, and access controls
            </p>
          </div>
        </div>
      </div>

      {/* MFA Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Multi-Factor Authentication</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">
                {mfaEnabled
                  ? "MFA is enabled. Your account is protected with an additional verification step."
                  : "Enable MFA to add an extra layer of security to your account."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supported methods: Authenticator app (TOTP)
              </p>
            </div>
            <button
              onClick={() => setMfaEnabled(!mfaEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                mfaEnabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  mfaEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Active Sessions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Browser</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">IP Address</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Last Active</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr
                    key={session.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{session.browser}</span>
                        {session.current && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Current
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      {session.ip}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {new Date(session.lastActive).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {!session.current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeSession(session.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* IP Restrictions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <CardTitle>IP Restrictions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Restrict access to the application from specific IP addresses or CIDR ranges.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                placeholder="e.g., 203.0.113.0/24"
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
              />
              <Button variant="outline" size="sm" onClick={addIP}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {allowedIPs.map((ip) => (
                <div
                  key={ip}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span className="font-mono text-sm">{ip}</span>
                  <button
                    onClick={() => removeIP(ip)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {allowedIPs.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  No IP restrictions configured. All IPs are allowed.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Policy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Password Policy</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Minimum Length
                </label>
                <input
                  type="number"
                  value={minLength}
                  onChange={(e) => setMinLength(parseInt(e.target.value) || 8)}
                  min={8}
                  max={32}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Password Expiry (days)
                </label>
                <input
                  type="number"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(parseInt(e.target.value) || 0)}
                  min={0}
                  max={365}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "Require uppercase letters", checked: requireUppercase, onChange: setRequireUppercase },
                { label: "Require numbers", checked: requireNumbers, onChange: setRequireNumbers },
                { label: "Require special characters", checked: requireSpecial, onChange: setRequireSpecial },
              ].map((policy) => (
                <label
                  key={policy.label}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={policy.checked}
                    onChange={(e) => policy.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm">{policy.label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => alert("Password policy saved (simulated)")}>
                <Shield className="h-3.5 w-3.5" />
                Save Policy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
