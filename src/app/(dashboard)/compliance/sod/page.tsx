"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SoDMatrix } from "@/components/compliance/sod-matrix";
import { getSoDMatrix } from "@/lib/compliance/sod";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function SoDPage() {
  const [matrixData, setMatrixData] = useState<ReturnType<typeof getSoDMatrix> | null>(null);

  useEffect(() => {
    try {
      const result = getSoDMatrix();
      setMatrixData(result);
    } catch {
      // If getSoDMatrix fails due to missing deps, provide fallback
      setMatrixData({ roles: [], conflicts: {} } as ReturnType<typeof getSoDMatrix>);
    }
  }, []);

  if (!matrixData) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/compliance">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <h1 className="text-2xl font-bold">Segregation of Duties</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              SoD conflict matrix across organizational roles
            </p>
          </div>
        </div>
      </div>

      <SoDMatrix
        conflicts={matrixData.conflicts}
        roles={matrixData.roles as string[]}
      />
    </div>
  );
}
