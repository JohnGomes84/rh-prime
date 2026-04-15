import "../_core/load-env";

import { eq } from "drizzle-orm";
import {
  accountsPayable,
  accountsReceivable,
  bankAccounts,
  clients,
  employees,
  suppliers,
  workSchedules,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { runSeeds } from "./seed";

type DemoClientSeed = {
  key: "aurora" | "nexus" | "horizonte";
  name: string;
  cnpj: string;
  city: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

type DemoEmployeeSeed = {
  cpf: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  pixKey: string | null;
  pixKeyType: "cpf" | "email" | "phone" | "random" | "cnpj" | null;
  notes: string;
  registrationDate: string;
};

type DemoScheduleSeed = {
  note: string;
  clientKey: DemoClientSeed["key"];
  date: string;
  shiftId: number;
  status: "pendente" | "validado" | "cancelado";
  totalPayValue: string;
  totalReceiveValue: string;
  totalPeople: number;
};

const DEMO_BANK_ACCOUNT_NAME = "Conta Operacional Finhub";
const DEMO_SUPPLIER_NAME = "Transportes Atlas";

const demoClients: DemoClientSeed[] = [
  {
    key: "aurora",
    name: "Logistica Aurora",
    cnpj: "11.111.111/0001-11",
    city: "Guarulhos",
    address: "Av. Industrial, 100",
    contactName: "Marina Souza",
    contactPhone: "(11) 98888-1001",
    contactEmail: "marina@aurora.com.br",
  },
  {
    key: "nexus",
    name: "Centro Distribuicao Nexus",
    cnpj: "22.222.222/0001-22",
    city: "Barueri",
    address: "Alameda dos Galpoes, 200",
    contactName: "Carlos Lima",
    contactPhone: "(11) 97777-2002",
    contactEmail: "carlos@nexus.com.br",
  },
  {
    key: "horizonte",
    name: "Operacoes Horizonte",
    cnpj: "33.333.333/0001-33",
    city: "Osasco",
    address: "Rua das Docas, 300",
    contactName: "Fernanda Reis",
    contactPhone: "(11) 96666-3003",
    contactEmail: "fernanda@horizonte.com.br",
  },
];

const demoEmployees: DemoEmployeeSeed[] = [
  {
    cpf: "111.111.111-11",
    name: "Joao Lider",
    email: "joao.lider@finhub.local",
    phone: "(11) 95555-1000",
    city: "Guarulhos",
    pixKey: "joao.lider@finhub.local",
    pixKeyType: "email",
    notes: "Lider principal",
    registrationDate: "2026-01-10 08:00:00",
  },
  {
    cpf: "222.222.222-22",
    name: "Ana Silva",
    email: "ana.silva@finhub.local",
    phone: "(11) 95555-2000",
    city: "Guarulhos",
    pixKey: "22222222222",
    pixKeyType: "cpf",
    notes: "Operacao carga e descarga",
    registrationDate: "2026-02-02 08:00:00",
  },
  {
    cpf: "333.333.333-33",
    name: "Bruno Costa",
    email: "bruno.costa@finhub.local",
    phone: "(11) 95555-3000",
    city: "Barueri",
    pixKey: null,
    pixKeyType: null,
    notes: "Sem PIX para acionar alerta",
    registrationDate: "2026-03-01 08:00:00",
  },
  {
    cpf: "444.444.444-44",
    name: "Carla Mendes",
    email: "carla.mendes@finhub.local",
    phone: "(11) 95555-4000",
    city: "Osasco",
    pixKey: "carla.pix@finhub.local",
    pixKeyType: "email",
    notes: "Apoio operacional",
    registrationDate: "2026-03-15 08:00:00",
  },
];

const demoSchedules: DemoScheduleSeed[] = [
  {
    note: "Operacao historica para comparativo",
    clientKey: "aurora",
    date: "2026-02-14 08:00:00",
    shiftId: 1,
    status: "validado",
    totalPayValue: "1800.00",
    totalReceiveValue: "3200.00",
    totalPeople: 4,
  },
  {
    note: "Operacao validada de marco",
    clientKey: "nexus",
    date: "2026-03-20 08:00:00",
    shiftId: 2,
    status: "validado",
    totalPayValue: "2400.00",
    totalReceiveValue: "4800.00",
    totalPeople: 6,
  },
  {
    note: "Planejamento pendente para alerta",
    clientKey: "aurora",
    date: "2026-04-04 08:00:00",
    shiftId: 1,
    status: "pendente",
    totalPayValue: "2100.00",
    totalReceiveValue: "4200.00",
    totalPeople: 5,
  },
  {
    note: "Operacao validada de abril",
    clientKey: "nexus",
    date: "2026-04-05 08:00:00",
    shiftId: 2,
    status: "validado",
    totalPayValue: "2600.00",
    totalReceiveValue: "5200.00",
    totalPeople: 6,
  },
  {
    note: "Operacao complementar",
    clientKey: "horizonte",
    date: "2026-04-07 08:00:00",
    shiftId: 3,
    status: "validado",
    totalPayValue: "1900.00",
    totalReceiveValue: "4100.00",
    totalPeople: 4,
  },
];

async function ensureBankAccount() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.name, DEMO_BANK_ACCOUNT_NAME))
    .limit(1);

  if (existing[0]) return existing[0];

  await db.insert(bankAccounts).values({
    name: DEMO_BANK_ACCOUNT_NAME,
    bankName: "Banco do Brasil",
    accountNumber: "12345-6",
    agency: "0001",
    accountType: "checking",
    initialBalance: "50000.00",
    currentBalance: "68450.00",
    isActive: true,
  });

  const created = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.name, DEMO_BANK_ACCOUNT_NAME))
    .limit(1);

  if (!created[0]) throw new Error("Failed to create demo bank account");
  return created[0];
}

async function ensureSupplier() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.name, DEMO_SUPPLIER_NAME))
    .limit(1);

  if (existing[0]) return existing[0];

  await db.insert(suppliers).values({
    name: DEMO_SUPPLIER_NAME,
    cnpj: "12.345.678/0001-90",
    city: "Guarulhos",
    pixKey: "financeiro@atlas.com.br",
    contactPhone: "(11) 99999-0001",
    contactEmail: "financeiro@atlas.com.br",
    isActive: true,
  });

  const created = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.name, DEMO_SUPPLIER_NAME))
    .limit(1);

  if (!created[0]) throw new Error("Failed to create demo supplier");
  return created[0];
}

async function ensureClients() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const clientMap = new Map<DemoClientSeed["key"], number>();

  for (const client of demoClients) {
    const existing = await db
      .select()
      .from(clients)
      .where(eq(clients.name, client.name))
      .limit(1);

    if (!existing[0]) {
      await db.insert(clients).values({
        name: client.name,
        cnpj: client.cnpj,
        city: client.city,
        address: client.address,
        contactName: client.contactName,
        contactPhone: client.contactPhone,
        contactEmail: client.contactEmail,
        isActive: true,
      });
    }

    const saved = await db
      .select()
      .from(clients)
      .where(eq(clients.name, client.name))
      .limit(1);

    if (!saved[0]) throw new Error(`Failed to ensure client ${client.name}`);
    clientMap.set(client.key, saved[0].id);
  }

  return clientMap;
}

async function ensureEmployees() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const employeeMap = new Map<string, number>();

  for (const employee of demoEmployees) {
    const existing = await db
      .select()
      .from(employees)
      .where(eq(employees.cpf, employee.cpf))
      .limit(1);

    if (!existing[0]) {
      await db.insert(employees).values({
        name: employee.name,
        cpf: employee.cpf,
        email: employee.email,
        phone: employee.phone,
        city: employee.city,
        pixKey: employee.pixKey,
        pixKeyType: employee.pixKeyType ?? undefined,
        status: "diarista",
        registrationDate: new Date(employee.registrationDate),
        notes: employee.notes,
      });
    }

    const saved = await db
      .select()
      .from(employees)
      .where(eq(employees.cpf, employee.cpf))
      .limit(1);

    if (!saved[0]) throw new Error(`Failed to ensure employee ${employee.name}`);
    employeeMap.set(employee.cpf, saved[0].id);
  }

  return employeeMap;
}

async function ensureSchedules(clientMap: Map<DemoClientSeed["key"], number>, leaderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const schedule of demoSchedules) {
    const existing = await db
      .select()
      .from(workSchedules)
      .where(eq(workSchedules.notes, schedule.note))
      .limit(1);

    if (existing[0]) continue;

    const clientId = clientMap.get(schedule.clientKey);
    if (!clientId) throw new Error(`Missing client id for ${schedule.clientKey}`);

    await db.insert(workSchedules).values({
      date: new Date(schedule.date),
      shiftId: schedule.shiftId,
      clientId,
      status: schedule.status,
      totalPayValue: schedule.totalPayValue,
      totalReceiveValue: schedule.totalReceiveValue,
      totalPeople: schedule.totalPeople,
      leaderId,
      notes: schedule.note,
    });
  }
}

async function ensureReceivables(clientMap: Map<DemoClientSeed["key"], number>, bankAccountId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const demoReceivables = [
    {
      description: "Faturamento Aurora - fevereiro",
      clientKey: "aurora" as const,
      costCenterId: 1,
      amount: "8200.00",
      dueDate: "2026-02-14 18:00:00",
      receiveDate: "2026-02-16 10:00:00",
      status: "recebido" as const,
      notes: "Receita historica",
    },
    {
      description: "Faturamento Nexus - marco",
      clientKey: "nexus" as const,
      costCenterId: 1,
      amount: "9600.00",
      dueDate: "2026-03-20 18:00:00",
      receiveDate: null,
      status: "pendente" as const,
      notes: "Receita pendente de marco",
    },
    {
      description: "Faturamento Aurora - abril",
      clientKey: "aurora" as const,
      costCenterId: 1,
      amount: "12500.00",
      dueDate: "2026-04-05 18:00:00",
      receiveDate: null,
      status: "pendente" as const,
      notes: "Receita principal de abril",
    },
    {
      description: "Faturamento Horizonte - abril",
      clientKey: "horizonte" as const,
      costCenterId: 1,
      amount: "6200.00",
      dueDate: "2026-04-07 18:00:00",
      receiveDate: "2026-04-08 09:00:00",
      status: "recebido" as const,
      notes: "Receita recebida em abril",
    },
    {
      description: "Faturamento Nexus - abril",
      clientKey: "nexus" as const,
      costCenterId: 1,
      amount: "4700.00",
      dueDate: "2026-04-04 18:00:00",
      receiveDate: null,
      status: "pendente" as const,
      notes: "Receita de apoio para ranking",
    },
  ];

  for (const receivable of demoReceivables) {
    const existing = await db
      .select()
      .from(accountsReceivable)
      .where(eq(accountsReceivable.description, receivable.description))
      .limit(1);

    if (existing[0]) continue;

    const clientId = clientMap.get(receivable.clientKey);
    if (!clientId) throw new Error(`Missing client id for ${receivable.clientKey}`);

    await db.insert(accountsReceivable).values({
      description: receivable.description,
      clientId,
      costCenterId: receivable.costCenterId,
      bankAccountId,
      amount: receivable.amount,
      dueDate: new Date(receivable.dueDate),
      receiveDate: receivable.receiveDate ? new Date(receivable.receiveDate) : null,
      status: receivable.status,
      notes: receivable.notes,
    });
  }
}

async function ensurePayables(
  clientMap: Map<DemoClientSeed["key"], number>,
  bankAccountId: number,
  supplierId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const demoPayables = [
    {
      description: "Frete terceirizado - fevereiro",
      clientKey: "aurora" as const,
      costCenterId: 2,
      amount: "3400.00",
      dueDate: "2026-02-15 12:00:00",
      paymentDate: "2026-02-17 15:00:00",
      status: "pago" as const,
      notes: "Custo historico",
    },
    {
      description: "Equipe extra - marco",
      clientKey: "nexus" as const,
      costCenterId: 2,
      amount: "6100.00",
      dueDate: "2026-03-21 12:00:00",
      paymentDate: null,
      status: "pendente" as const,
      notes: "Custo pendente de marco",
    },
    {
      description: "Frete vencido - abril",
      clientKey: "aurora" as const,
      costCenterId: 2,
      amount: "2800.00",
      dueDate: "2026-04-05 12:00:00",
      paymentDate: null,
      status: "pendente" as const,
      notes: "Conta vencida para alerta",
    },
    {
      description: "Marmitas operacao Nexus - abril",
      clientKey: "nexus" as const,
      costCenterId: 1,
      amount: "1900.00",
      dueDate: "2026-04-07 12:00:00",
      paymentDate: "2026-04-07 18:00:00",
      status: "pago" as const,
      notes: "Despesa paga no mes",
    },
    {
      description: "Apoio operacional Horizonte - abril",
      clientKey: "horizonte" as const,
      costCenterId: 3,
      amount: "4100.00",
      dueDate: "2026-04-09 12:00:00",
      paymentDate: null,
      status: "pendente" as const,
      notes: "Despesa futura do mes",
    },
  ];

  for (const payable of demoPayables) {
    const existing = await db
      .select()
      .from(accountsPayable)
      .where(eq(accountsPayable.description, payable.description))
      .limit(1);

    if (existing[0]) continue;

    const clientId = clientMap.get(payable.clientKey);
    if (!clientId) throw new Error(`Missing client id for ${payable.clientKey}`);

    await db.insert(accountsPayable).values({
      description: payable.description,
      supplierId,
      clientId,
      costCenterId: payable.costCenterId,
      bankAccountId,
      amount: payable.amount,
      dueDate: new Date(payable.dueDate),
      paymentDate: payable.paymentDate ? new Date(payable.paymentDate) : null,
      status: payable.status,
      notes: payable.notes,
    });
  }
}

export async function runDashboardDemoSeed() {
  await runSeeds();

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  console.log("[SEED:DEMO] Ensuring dashboard demo data...");

  const bankAccount = await ensureBankAccount();
  const supplier = await ensureSupplier();
  const clientMap = await ensureClients();
  await ensureEmployees();

  const leader = await db
    .select()
    .from(employees)
    .where(eq(employees.cpf, "111.111.111-11"))
    .limit(1);

  if (!leader[0]) throw new Error("Demo leader not found");

  await ensureSchedules(clientMap, leader[0].id);
  await ensureReceivables(clientMap, bankAccount.id);
  await ensurePayables(clientMap, bankAccount.id, supplier.id);

  const counts = await Promise.all([
    db.select().from(clients),
    db.select().from(employees),
    db.select().from(accountsReceivable),
    db.select().from(accountsPayable),
    db.select().from(workSchedules),
  ]);

  console.log(
    `[SEED:DEMO] Done. clients=${counts[0].length} employees=${counts[1].length} receivables=${counts[2].length} payables=${counts[3].length} schedules=${counts[4].length}`
  );
}
