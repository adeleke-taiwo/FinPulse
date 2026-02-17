import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processCSVData } from "@/lib/etl";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (!["ADMIN", "ANALYST"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mappingStr = formData.get("mapping") as string;

    if (!file || !mappingStr) {
      return NextResponse.json(
        { error: "File and column mapping required" },
        { status: 400 }
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
        uploadedById: session.user.id,
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
        actorId: session.user.id,
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
