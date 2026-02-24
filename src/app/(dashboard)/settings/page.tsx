"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "@/components/layout/theme-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sun, Moon, Monitor } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);

  const themes = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "system" as const, label: "System", icon: Monitor },
  ];

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Name
                </label>
                <p className="text-sm font-medium text-foreground">
                  {session?.user?.name}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Email
                </label>
                <p className="text-sm text-foreground">{session?.user?.email}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Role
                </label>
                <p className="text-sm font-medium text-primary">
                  {(session?.user as { role?: string })?.role || "USER"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose your preferred theme
              </p>
              <div className="flex gap-3">
                {themes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setTheme(t.value);
                      handleSave();
                    }}
                    className={`flex flex-1 flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                      theme === t.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <t.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
              {saved && (
                <p className="text-xs text-success">Theme saved!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
