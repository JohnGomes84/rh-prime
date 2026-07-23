import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS = [
  "drizzle/0029_kanban_v2_foundation.sql",
  "drizzle/0030_kanban_v2_global_status.sql",
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const conn = await mysql.createConnection({ uri: url, ssl: { rejectUnauthorized: true }, multipleStatements: false });
  console.log("connected to", url.split("/").pop());

  for (const file of MIGRATIONS) {
    console.log(`\n=== ${file} ===`);
    const sql = readFileSync(resolve(file), "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      const preview = stmt.replace(/\s+/g, " ").slice(0, 90);
      try {
        await conn.query(stmt);
        console.log(`  OK: ${preview}`);
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        if (msg.match(/Duplicate column|already exists|Duplicate key name/i)) {
          console.log(`  SKIP (exists): ${preview}`);
        } else {
          console.error(`  FAIL: ${preview}\n    ${msg}`);
          throw e;
        }
      }
    }
  }

  await conn.end();
  console.log("\nall migrations applied");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
