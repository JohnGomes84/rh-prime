import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const sqlFile = "drizzle/0032_managerial_reports.sql";
const raw = readFileSync(sqlFile, "utf8");

// The migration is hand-written in drizzle style: statements separated by the
// `--> statement-breakpoint` marker. Split on it, then drop pure-comment/blank
// lines from each chunk so mysql gets clean DDL.
const statements = raw
  .split("--> statement-breakpoint")
  .map((chunk) =>
    chunk
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim(),
  )
  .filter((s) => s.length > 0);

const conn = await mysql.createConnection(databaseUrl);
console.log(`Conectado. Aplicando ${statements.length} statements de ${sqlFile}\n`);

const ALREADY_EXISTS = new Set([
  "ER_TABLE_EXISTS_ERROR",
  "ER_DUP_KEYNAME",
  "ER_DUP_FIELDNAME",
]);

for (const stmt of statements) {
  const label = stmt.replace(/\s+/g, " ").slice(0, 70);
  try {
    await conn.query(stmt);
    console.log(`✓ ${label}`);
  } catch (e) {
    if (ALREADY_EXISTS.has(e.code) || /already exists|Duplicate/i.test(e.message)) {
      console.log(`~ ${label} (já existe)`);
    } else {
      console.error(`✗ ${label}\n   ${e.message}`);
      throw e;
    }
  }
}

const [tables] = await conn.query("SHOW TABLES LIKE 'mr\\_%'");
console.log(`\nTabelas mr_* existentes (${tables.length}):`);
tables.forEach((r) => console.log(" -", Object.values(r)[0]));

for (const t of ["mr_reports", "mr_report_items"]) {
  const [cols] = await conn.query(`SHOW COLUMNS FROM \`${t}\``);
  console.log(`\n${t}: ${cols.length} colunas`);
}

await conn.end();
console.log("\nPronto.");
