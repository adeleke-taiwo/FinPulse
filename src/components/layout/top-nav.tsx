"use client";

import { signOut, useSession } from "next-auth/react";
import { useTheme } from "./theme-provider";
import { Moon, Sun, Monitor, LogOut, Bell, Building2 } from "lucide-react";
import { getInitials } from "@/lib/utils";

export function TopNav() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const themeIcon =
    theme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : theme === "light" ? (
      <Sun className="h-4 w-4" />
    ) : (
      <Monitor className="h-4 w-4" />
    );

  function cycleTheme() {
    const order: Array<"light" | "dark" | "system"> = [
      "light",
      "dark",
      "system",
    ];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  }

  const nameParts = session?.user?.name?.split(" ") || ["", ""];
  const orgName = session?.user?.organizationName ?? null;
  const orgRole = session?.user?.orgRole ?? null;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {orgName && (
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium truncate max-w-[200px]">{orgName}</span>
            {orgRole && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {orgRole.replace(/_/g, " ")}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={cycleTheme}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={`Theme: ${theme}`}
        >
          {themeIcon}
        </button>

        <button className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {getInitials(nameParts[0], nameParts[1] || "")}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
