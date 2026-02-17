import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, Bitcoin, Upload } from "lucide-react";

const sources = [
  {
    title: "GitHub Activity",
    description: "Commit, PR, and issue tracking across repositories",
    href: "/data-sources/github",
    icon: Github,
    status: "Active",
    lastSync: "Every 6 hours",
  },
  {
    title: "Crypto Prices",
    description: "BTC, ETH, SOL price history from CoinGecko",
    href: "/data-sources/crypto",
    icon: Bitcoin,
    status: "Active",
    lastSync: "Every 15 min",
  },
  {
    title: "CSV Upload",
    description: "Manual data import via CSV file upload",
    href: "/upload",
    icon: Upload,
    status: "Manual",
    lastSync: "On demand",
  },
];

export default function DataSourcesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Data Sources</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {sources.map((source) => (
          <Link key={source.href} href={source.href}>
            <Card className="transition-shadow hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-muted p-3">
                  <source.icon className="h-6 w-6 text-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-foreground">{source.title}</h2>
                    <Badge variant={source.status === "Active" ? "success" : "default"}>
                      {source.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{source.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sync: {source.lastSync}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
