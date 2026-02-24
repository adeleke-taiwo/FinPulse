"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SoDMatrix } from "@/components/compliance/sod-matrix";
import { getSoDMatrix } from "@/lib/compliance/sod";
import { ArrowLeft, ShieldAlert } from "lucide-react";

function getMatrixDataSafe() {
  try {
    return getSoDMatrix();
  } catch {
    return { roles: [], conflicts: {} } as ReturnType<typeof getSoDMatrix>;
  }
}

export default function SoDPage() {
  const matrixData = getMatrixDataSafe();

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
