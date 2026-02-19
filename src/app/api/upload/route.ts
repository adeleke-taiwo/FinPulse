import { NextRequest, NextResponse } from "next/server";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/db";
import { processCSVData } from "@/lib/etl";
import Papa from "papaparse";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePermission("admin", "create");
    if (isAuthError(authResult)) return authResult;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mappingStr = formData.get("mapping") as string;

    if (!file || !mappingStr) {
      return NextResponse.json(
        { error: "File and column mapping required" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 413 }
      );
    }

    const mapping = JSON.parse(mappingStr) as Record<string, string>;
    const text = await file.text();

    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: "Failed to parse CSV", details: parsed.errors },
        { status: 400 }
      );
    }

    // Create upload record
    const upload = await prisma.dataUpload.create({
      data: {
        uploadedById: authResult.userId,
        fileName: file.name,
        rowCount: parsed.data.length,
        status: "PENDING",
      },
    });

    // Process ETL
    const result = await processCSVData(
      parsed.data as Record<string, string>[],
      mapping,
      upload.id
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: authResult.userId,
        action: "upload.process",
        resource: "data_upload",
        resourceId: upload.id,
        details: {
          fileName: file.name,
          rowsProcessed: result.rowsProcessed,
          rowsFailed: result.rowsFailed,
        },
      },
    });

    return NextResponse.json({
      uploadId: upload.id,
      ...result,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
