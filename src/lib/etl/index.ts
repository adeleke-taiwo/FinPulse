import { prisma } from "@/lib/db";

export interface ETLResult {
  success: boolean;
  rowsProcessed: number;
  rowsFailed: number;
  errors: { row: number; field: string; message: string }[];
}

export async function processCSVData(
  rows: Record<string, string>[],
  columnMapping: Record<string, string>,
  uploadId: string
): Promise<ETLResult> {
  const result: ETLResult = {
    success: true,
    rowsProcessed: 0,
    rowsFailed: 0,
    errors: [],
  };

  await prisma.dataUpload.update({
    where: { id: uploadId },
    data: { status: "PROCESSING", rowCount: rows.length },
  });

  const transactions: {
    type: "CREDIT" | "DEBIT" | "TRANSFER" | "FEE" | "INTEREST" | "REFUND";
    amount: number;
    description?: string;
    occurredAt: Date;
    categoryId?: string;
    status: "COMPLETED";
  }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const amount = parseFloat(row[columnMapping.amount]);
      if (isNaN(amount) || amount <= 0) {
        result.errors.push({ row: i + 1, field: "amount", message: "Invalid amount" });
        result.rowsFailed++;
        continue;
      }

      const type = row[columnMapping.type]?.toUpperCase();
      if (!["CREDIT", "DEBIT", "TRANSFER", "FEE", "INTEREST", "REFUND"].includes(type)) {
        result.errors.push({ row: i + 1, field: "type", message: `Invalid type: ${type}` });
        result.rowsFailed++;
        continue;
      }

      const dateStr = row[columnMapping.date];
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        result.errors.push({ row: i + 1, field: "date", message: "Invalid date" });
        result.rowsFailed++;
        continue;
      }

      transactions.push({
        type: type as "CREDIT" | "DEBIT" | "TRANSFER" | "FEE" | "INTEREST" | "REFUND",
        amount,
        description: row[columnMapping.description] || `CSV import row ${i + 1}`,
        occurredAt: date,
        status: "COMPLETED",
      });

      result.rowsProcessed++;
    } catch {
      result.errors.push({ row: i + 1, field: "unknown", message: "Parse error" });
      result.rowsFailed++;
    }
  }

  // Batch insert
  if (transactions.length > 0) {
    await prisma.transaction.createMany({ data: transactions });
  }

  await prisma.dataUpload.update({
    where: { id: uploadId },
    data: {
      status: result.rowsFailed > 0 && result.rowsProcessed === 0 ? "FAILED" : "COMPLETED",
      validRows: result.rowsProcessed,
      invalidRows: result.rowsFailed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    },
  });

  return result;
}
