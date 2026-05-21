import mysql from "mysql2/promise";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

function escapeValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `'${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())} ${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}:${pad(v.getUTCSeconds())}'`;
  }
  if (Buffer.isBuffer(v)) return `0x${v.toString("hex")}`;
  if (typeof v === "object") {
    const s = JSON.stringify(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return `'${s}'`;
  }
  const s = String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  return `'${s}'`;
}

async function main() {
  const url = process.env.PROD_DATABASE_URL;
  if (!url) {
    console.error("PROD_DATABASE_URL not set");
    process.exit(1);
  }

  const conn = await mysql.createConnection({ uri: url, ssl: { rejectUnauthorized: true } });
  console.log("connected to prod");

  const [dbRows] = await conn.query("SELECT DATABASE() AS db");
  const dbName = (dbRows as Array<{ db: string }>)[0].db;
  console.log(`database: ${dbName}`);

  const [tableRows] = await conn.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
    [dbName],
  );
  const tables = (tableRows as Array<{ TABLE_NAME: string }>).map((r) => r.TABLE_NAME);
  console.log(`tables: ${tables.length}`);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = resolve("backups");
  mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, `rh_prime-full-${stamp}.sql`);

  const parts: string[] = [];
  parts.push(`-- rh_prime full dump ${new Date().toISOString()}`);
  parts.push(`-- source: TiDB rh_prime`);
  parts.push(`-- tables: ${tables.length}`);
  parts.push(`SET FOREIGN_KEY_CHECKS=0;`);
  parts.push(`SET UNIQUE_CHECKS=0;`);
  parts.push("");

  let totalRows = 0;
  const stats: Array<{ table: string; rows: number }> = [];

  for (const t of tables) {
    const [createRows] = await conn.query(`SHOW CREATE TABLE \`${t}\``);
    const createSql = (createRows as Array<Record<string, string>>)[0]["Create Table"];
    parts.push(`-- ===== ${t} =====`);
    parts.push(`DROP TABLE IF EXISTS \`${t}\`;`);
    parts.push(`${createSql};`);

    const [dataRows] = await conn.query(`SELECT * FROM \`${t}\``);
    const arr = dataRows as Record<string, unknown>[];
    if (arr.length > 0) {
      const cols = Object.keys(arr[0]);
      const colList = cols.map((c) => `\`${c}\``).join(", ");
      const CHUNK = 200;
      for (let i = 0; i < arr.length; i += CHUNK) {
        const slice = arr.slice(i, i + CHUNK);
        const values = slice
          .map((row) => "(" + cols.map((c) => escapeValue(row[c])).join(", ") + ")")
          .join(",\n  ");
        parts.push(`INSERT INTO \`${t}\` (${colList}) VALUES\n  ${values};`);
      }
    }
    parts.push("");
    totalRows += arr.length;
    stats.push({ table: t, rows: arr.length });
    console.log(`  ${t}: ${arr.length} rows`);
  }

  parts.push(`SET FOREIGN_KEY_CHECKS=1;`);
  parts.push(`SET UNIQUE_CHECKS=1;`);

  writeFileSync(outFile, parts.join("\n"), "utf8");
  await conn.end();

  console.log("");
  console.log(`backup saved: ${outFile}`);
  console.log(`total tables: ${tables.length}`);
  console.log(`total rows: ${totalRows}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
