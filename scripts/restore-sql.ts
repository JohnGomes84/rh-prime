import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function splitStatements(sql: string): string[] {
  const stripped = sql
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("--");
      if (idx < 0) return line;
      let inSingle = false;
      let inDouble = false;
      let inBacktick = false;
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (!inDouble && !inBacktick && c === "'" && line[j - 1] !== "\\") inSingle = !inSingle;
        else if (!inSingle && !inBacktick && c === '"' && line[j - 1] !== "\\") inDouble = !inDouble;
        else if (!inSingle && !inDouble && c === "`") inBacktick = !inBacktick;
        if (!inSingle && !inDouble && !inBacktick && c === "-" && line[j + 1] === "-") {
          return line.slice(0, j);
        }
      }
      return line;
    })
    .join("\n");

  const out: string[] = [];
  let buf = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;

  for (let i = 0; i < stripped.length; i++) {
    const c = stripped[i];
    if (!inDouble && !inBacktick && c === "'" && stripped[i - 1] !== "\\") inSingle = !inSingle;
    else if (!inSingle && !inBacktick && c === '"' && stripped[i - 1] !== "\\") inDouble = !inDouble;
    else if (!inSingle && !inDouble && c === "`") inBacktick = !inBacktick;

    if (c === ";" && !inSingle && !inDouble && !inBacktick) {
      const stmt = buf.trim();
      if (stmt) out.push(stmt);
      buf = "";
    } else {
      buf += c;
    }
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

async function main() {
  const url = process.env.TARGET_DATABASE_URL;
  const file = process.env.RESTORE_FILE;
  if (!url || !file) {
    console.error("set TARGET_DATABASE_URL and RESTORE_FILE");
    process.exit(1);
  }

  const sql = readFileSync(resolve(file), "utf8");
  const stmts = splitStatements(sql);
  console.log(`statements: ${stmts.length}`);

  const conn = await mysql.createConnection({ uri: url, ssl: { rejectUnauthorized: true }, multipleStatements: false });
  console.log("connected target");
  await conn.query("SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION'");
  await conn.query("SET SESSION foreign_key_checks = 0");
  await conn.query("SET SESSION unique_checks = 0");

  let i = 0;
  for (const s of stmts) {
    i++;
    try {
      await conn.query(s);
      if (i % 50 === 0 || i === stmts.length) console.log(`  ${i}/${stmts.length}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`stmt ${i} FAILED: ${msg}`);
      console.error(`SQL head: ${s.slice(0, 200)}`);
      await conn.end();
      process.exit(1);
    }
  }
  await conn.end();
  console.log(`restore complete: ${i} statements`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
