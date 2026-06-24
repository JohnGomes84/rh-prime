/**
 * Adds resetToken and resetTokenExpiresAt columns to the users table.
 * Safe to run multiple times — checks IF NOT EXISTS.
 *
 * Usage: node scripts/apply-reset-token-columns.mjs
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

const stmts = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS resetToken VARCHAR(128) DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS resetTokenExpiresAt TIMESTAMP NULL DEFAULT NULL`,
];

for (const sql of stmts) {
  console.log("→", sql.slice(0, 80) + "...");
  await conn.execute(sql);
  console.log("  ✓ ok");
}

await conn.end();
console.log("\nDone.");
