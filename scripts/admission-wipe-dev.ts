// One-off: backup admission data (JSON) + wipe admission tables.
// Usage: pnpm tsx scripts/admission-wipe-dev.ts
import "dotenv/config";
import { config } from "dotenv";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import mysql from "mysql2/promise";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL nao definida");
  process.exit(1);
}

const dbName = url.split("/").pop()?.split("?")[0] ?? "?";
console.log(`[wipe] target DB: ${dbName}`);
if (dbName === "rh_prime") {
  console.error("STOP: target = rh_prime (prod). Aborting.");
  process.exit(2);
}

const needsTls = /tidbcloud\.com|sslmode=require|ssl=true/i.test(url);
const pool = mysql.createPool({
  uri: url,
  connectionLimit: 2,
  ...(needsTls ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } } : {}),
});

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
  const backupDir = "backups";
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

  // 1) Snapshot
  console.log("[backup] snapshot pre-wipe...");
  const [workflows] = await pool.query("SELECT * FROM admission_workflows");
  const [items] = await pool.query("SELECT * FROM admission_checklist_items");
  const [docs] = await pool.query(
    "SELECT * FROM documents WHERE admission_workflow_id IS NOT NULL"
  );
  const [sigs] = await pool.query(
    `SELECT s.* FROM document_signatures s
     INNER JOIN documents d ON s.documentId = d.id
     WHERE d.admission_workflow_id IS NOT NULL`
  );

  const snapshot = {
    db: dbName,
    timestamp: new Date().toISOString(),
    counts: {
      workflows: (workflows as any[]).length,
      checklist_items: (items as any[]).length,
      docs: (docs as any[]).length,
      signatures: (sigs as any[]).length,
    },
    workflows,
    checklist_items: items,
    docs,
    signatures: sigs,
  };

  const backupFile = join(backupDir, `${dbName}-${stamp}-pre-admission-wipe.json`);
  writeFileSync(backupFile, JSON.stringify(snapshot, null, 2), "utf-8");
  console.log(`[backup] saved -> ${backupFile}`);
  console.log(`[backup] counts:`, snapshot.counts);

  // 2) Wipe
  console.log("[wipe] running DELETEs...");
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r1] = await conn.query(
      `DELETE FROM document_signatures
       WHERE documentId IN (
         SELECT id FROM (
           SELECT id FROM documents WHERE admission_workflow_id IS NOT NULL
         ) AS sub
       )`
    );
    const [r2] = await conn.query(
      "DELETE FROM documents WHERE admission_workflow_id IS NOT NULL"
    );
    const [r3] = await conn.query("DELETE FROM admission_checklist_items");
    const [r4] = await conn.query("DELETE FROM admission_workflows");
    await conn.commit();
    console.log(`[wipe] signatures: ${(r1 as any).affectedRows}`);
    console.log(`[wipe] documents:  ${(r2 as any).affectedRows}`);
    console.log(`[wipe] checklist:  ${(r3 as any).affectedRows}`);
    console.log(`[wipe] workflows:  ${(r4 as any).affectedRows}`);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  // 3) Reset auto_increment
  await pool.query("ALTER TABLE admission_workflows AUTO_INCREMENT = 1");
  await pool.query("ALTER TABLE admission_checklist_items AUTO_INCREMENT = 1");
  console.log("[wipe] AUTO_INCREMENT reset");

  // 4) Verify
  const [vW] = await pool.query("SELECT COUNT(*) c FROM admission_workflows");
  const [vI] = await pool.query("SELECT COUNT(*) c FROM admission_checklist_items");
  const [vD] = await pool.query(
    "SELECT COUNT(*) c FROM documents WHERE admission_workflow_id IS NOT NULL"
  );
  console.log("[verify] post-wipe counts:");
  console.log(`  workflows:      ${(vW as any[])[0].c}`);
  console.log(`  checklist:      ${(vI as any[])[0].c}`);
  console.log(`  docs(adm):      ${(vD as any[])[0].c}`);
}

main()
  .then(() => {
    console.log("[done]");
    pool.end();
  })
  .catch((e) => {
    console.error("[error]", e);
    pool.end();
    process.exit(1);
  });
