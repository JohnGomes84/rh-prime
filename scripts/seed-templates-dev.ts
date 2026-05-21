// Roda scripts/seed-admission-templates.sql no DB configurado em DATABASE_URL.
import "dotenv/config";
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL nao definida");
  process.exit(1);
}

const dbName = url.split("/").pop()?.split("?")[0] ?? "?";
console.log(`[seed] target DB: ${dbName}`);

const needsTls = /tidbcloud\.com|sslmode=require|ssl=true/i.test(url);
const conn = await mysql.createConnection({
  uri: url,
  multipleStatements: true,
  ...(needsTls ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } } : {}),
});

const sql = readFileSync("scripts/seed-admission-templates.sql", "utf-8");
console.log(`[seed] executing ${sql.length} chars of SQL...`);
const [res] = await conn.query(sql);
console.log("[seed] result:", res);

const [check] = await conn.query(
  "SELECT id, machine_key, templateName FROM document_templates ORDER BY id"
);
console.log("[seed] templates atuais:");
console.table(check);

await conn.end();
