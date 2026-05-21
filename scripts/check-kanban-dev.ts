import "dotenv/config";
import { config } from "dotenv";
import mysql from "mysql2/promise";
config({ path: ".env.local" });

const url = process.env.DATABASE_URL!;
const needsTls = /tidbcloud\.com/i.test(url);
const conn = await mysql.createConnection({
  uri: url,
  ...(needsTls ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } } : {}),
});

const dbName = url.split("/").pop()?.split("?")[0];
console.log(`DB: ${dbName}\n`);

const tables = [
  "kanban_boards",
  "kanban_columns",
  "kanban_cards",
  "kanban_card_comments",
  "kanban_card_attachments",
  "admission_workflows",
];

for (const t of tables) {
  try {
    const [r] = await conn.query(`SELECT COUNT(*) c FROM ${t}`);
    console.log(`${t.padEnd(28)} ${(r as any[])[0].c}`);
  } catch (e: any) {
    console.log(`${t.padEnd(28)} ERR: ${e.code ?? e.message}`);
  }
}
await conn.end();
