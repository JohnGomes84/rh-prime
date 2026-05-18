/**
 * Detecta registros órfãos antes de adicionar FK constraints.
 * Roda contra DATABASE_URL configurado em .env.local.
 *
 * Uso: pnpm tsx scripts/check-orphans.ts
 */
import { config } from "dotenv";
import mysql from "mysql2/promise";

config({ path: ".env.local" });
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não configurada");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

type Check = {
  label: string;
  childTable: string;
  childCol: string;
  parentTable: string;
  nullable: boolean;
};

const checks: Check[] = [
  // accounts_payable
  { label: "accounts_payable.supplierId", childTable: "accounts_payable", childCol: "supplierId", parentTable: "suppliers", nullable: true },
  { label: "accounts_payable.clientId", childTable: "accounts_payable", childCol: "clientId", parentTable: "clients", nullable: true },
  { label: "accounts_payable.costCenterId", childTable: "accounts_payable", childCol: "costCenterId", parentTable: "cost_centers", nullable: true },
  { label: "accounts_payable.bankAccountId", childTable: "accounts_payable", childCol: "bankAccountId", parentTable: "bank_accounts", nullable: true },
  // accounts_receivable
  { label: "accounts_receivable.clientId", childTable: "accounts_receivable", childCol: "clientId", parentTable: "clients", nullable: true },
  { label: "accounts_receivable.costCenterId", childTable: "accounts_receivable", childCol: "costCenterId", parentTable: "cost_centers", nullable: true },
  { label: "accounts_receivable.bankAccountId", childTable: "accounts_receivable", childCol: "bankAccountId", parentTable: "bank_accounts", nullable: true },
  // work_schedules
  { label: "work_schedules.clientId", childTable: "work_schedules", childCol: "clientId", parentTable: "clients", nullable: false },
  { label: "work_schedules.shiftId", childTable: "work_schedules", childCol: "shiftId", parentTable: "shifts", nullable: true },
  { label: "work_schedules.clientUnitId", childTable: "work_schedules", childCol: "clientUnitId", parentTable: "client_units", nullable: true },
  { label: "work_schedules.leaderId", childTable: "work_schedules", childCol: "leaderId", parentTable: "employees", nullable: true },
  // schedule_functions
  { label: "schedule_functions.scheduleId", childTable: "schedule_functions", childCol: "scheduleId", parentTable: "work_schedules", nullable: false },
  { label: "schedule_functions.jobFunctionId", childTable: "schedule_functions", childCol: "jobFunctionId", parentTable: "job_functions", nullable: false },
  // schedule_allocations
  { label: "schedule_allocations.scheduleFunctionId", childTable: "schedule_allocations", childCol: "scheduleFunctionId", parentTable: "schedule_functions", nullable: false },
  { label: "schedule_allocations.scheduleId", childTable: "schedule_allocations", childCol: "scheduleId", parentTable: "work_schedules", nullable: false },
  { label: "schedule_allocations.employeeId", childTable: "schedule_allocations", childCol: "employeeId", parentTable: "employees", nullable: false },
  { label: "schedule_allocations.paymentBatchId", childTable: "schedule_allocations", childCol: "paymentBatchId", parentTable: "payment_batches", nullable: true },
  // client_units
  { label: "client_units.clientId", childTable: "client_units", childCol: "clientId", parentTable: "clients", nullable: false },
  // client_functions
  { label: "client_functions.clientId", childTable: "client_functions", childCol: "clientId", parentTable: "clients", nullable: false },
  { label: "client_functions.jobFunctionId", childTable: "client_functions", childCol: "jobFunctionId", parentTable: "job_functions", nullable: false },
  // payment_batches
  { label: "payment_batches.bankAccountId", childTable: "payment_batches", childCol: "bankAccountId", parentTable: "bank_accounts", nullable: true },
  // payment_batch_items
  { label: "payment_batch_items.batchId", childTable: "payment_batch_items", childCol: "batchId", parentTable: "payment_batches", nullable: false },
  { label: "payment_batch_items.employeeId", childTable: "payment_batch_items", childCol: "employeeId", parentTable: "employees", nullable: false },
  // pix_change_requests
  { label: "pix_change_requests.employeeId", childTable: "pix_change_requests", childCol: "employeeId", parentTable: "employees", nullable: false },
];

const results: Array<{ check: string; orphans: number }> = [];
let totalOrphans = 0;

for (const c of checks) {
  const nullClause = c.nullable ? `${c.childCol} IS NOT NULL AND` : "";
  const sql = `
    SELECT COUNT(*) AS cnt
    FROM \`${c.childTable}\`
    WHERE ${nullClause} ${c.childCol} NOT IN (SELECT id FROM \`${c.parentTable}\`)
  `;
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(sql);
  const cnt = Number(rows[0]?.cnt || 0);
  results.push({ check: c.label, orphans: cnt });
  totalOrphans += cnt;
}

console.log("\n=== ÓRFÃOS POR FK ===");
for (const r of results) {
  const flag = r.orphans > 0 ? "❌" : "✓";
  console.log(`${flag} ${r.check.padEnd(50)} ${r.orphans}`);
}
console.log(`\nTotal: ${totalOrphans} órfãos`);

if (totalOrphans > 0) {
  console.log("\n=== DETALHAMENTO DOS ÓRFÃOS ===");
  for (const c of checks) {
    const r = results.find(x => x.check === c.label);
    if (!r || r.orphans === 0) continue;
    const nullClause = c.nullable ? `${c.childCol} IS NOT NULL AND` : "";
    const sql = `
      SELECT id, ${c.childCol} AS missing_ref
      FROM \`${c.childTable}\`
      WHERE ${nullClause} ${c.childCol} NOT IN (SELECT id FROM \`${c.parentTable}\`)
      LIMIT 20
    `;
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(sql);
    console.log(`\n${c.label}:`);
    for (const row of rows) {
      console.log(`  child id=${row.id}, ref ${c.childCol}=${row.missing_ref}`);
    }
    if (r.orphans > 20) console.log(`  ... e mais ${r.orphans - 20}`);
  }
}

await conn.end();
process.exit(0);
