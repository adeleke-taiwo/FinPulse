import { z } from "zod/v4";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.email(),
  password: z.string().min(6).max(100),
});

export const transactionCreateSchema = z.object({
  fromAccountId: z.string().uuid().optional(),
  toAccountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(["CREDIT", "DEBIT", "TRANSFER", "FEE", "INTEREST", "REFUND"]),
  amount: z.number().positive(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const transactionFilterSchema = z.object({
  type: z
    .enum(["CREDIT", "DEBIT", "TRANSFER", "FEE", "INTEREST", "REFUND"])
    .optional(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REVERSED"]).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().default("occurredAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const dateRangeSchema = z.object({
  from: z.string(),
  to: z.string(),
  granularity: z.enum(["daily", "weekly", "monthly"]).default("daily"),
});

export const csvRowSchema = z.object({
  date: z.string(),
  amount: z.string().transform(Number),
  type: z.enum(["CREDIT", "DEBIT", "TRANSFER", "FEE", "INTEREST", "REFUND"]),
  description: z.string().optional(),
  category: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type CsvRowInput = z.infer<typeof csvRowSchema>;
