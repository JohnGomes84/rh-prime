import mysql from "mysql2/promise";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const TABLES = [
  "kanban_boards",
  "kanban_lists",
  "kanban_cards",
  "kanban_checklist_items",
  "kanban_card_assignees",
  "kanban_labels",
  "kanban_card_labels",
  "kanban_board_members",
  "kanban_card_comments",
  "kanban_card_attachments",
];

function escapeValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace("T", " ")}'`;
  if (Buffer.isBuffer(v)) return `0x${v.toString("hex")}`;
  const s = String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  return `'${s}'`;
}

async function main() {
  const url = process.env.PRE_V2_DB_URL;
  if (!url) {
    console.error("PRE_V2_DB_URL not set");
    process.exit(1);
  }

  const conn = await mysql.createConnection({ uri: url, ssl: { rejectUnauthorized: true } });
  console.log("connected");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = resolve("backups");
  mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, `kanban-pre-v2-${stamp}.sql`);

  const dbName = url.split("/").pop()?.split("?")[0] ?? "unknown";
  let buf = `-- kanban backup pre-v2 ${new Date().toISOString()}\n`;
  buf += `-- source: TiDB ${dbName}\n`;
  buf += `SET FOREIGN_KEY_CHECKS=0;\n\n`;

  let totalRows = 0;
  for (const t of TABLES) {
    const [rows] = await conn.query(`SELECT * FROM \`${t}\``);
    const arr = rows as Record<string, unknown>[];
    buf += `-- ===== ${t} (${arr.length} rows) =====\n`;
    if (arr.length === 0) {
      buf += `-- empty\n\n`;
      continue;
    }
    const cols = Object.keys(arr[0]);
    const colList = cols.map((c) => `\`${c}\``).join(", ");
    for (const row of arr) {
      const vals = cols.map((c) => escapeValue(row[c])).join(", ");
      buf += `INSERT INTO \`${t}\` (${colList}) VALUES (${vals});\n`;
    }
    buf += `\n`;
    totalRows += arr.length;
    console.log(`  ${t}: ${arr.length} rows`);
  }

  buf += `SET FOREIGN_KEY_CHECKS=1;\n`;
  writeFileSync(outFile, buf, "utf8");
  await conn.end();
  console.log(`\nbackup saved: ${outFile}`);
  console.log(`total rows: ${totalRows}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
