import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  const sqlDir = path.join(__dirname, "..", "prisma", "sql");
  const files = fs.readdirSync(sqlDir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    console.log(`Running ${file}...`);
    const sql = fs.readFileSync(path.join(sqlDir, file), "utf-8");

    // Split on semicolons, handling the SELECT function calls
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const stmt of statements) {
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (e: unknown) {
        const msg = (e as Error).message || "";
        // Skip "already exists" errors
        if (msg.includes("already exists") || msg.includes("duplicate")) {
          continue;
        }
        console.warn(`  Warning on statement: ${stmt.slice(0, 80)}...`);
        console.warn(`  ${msg}`);
      }
    }
    console.log(`  ✓ ${file} complete`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
