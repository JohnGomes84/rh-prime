/**
 * Geradores de arquivos para compliance Portaria MTP 671/2021 (REP-P).
 *
 * AFD  — Arquivo Fonte de Dados (registros brutos)
 * AFDT — Arquivo Fonte de Dados Tratado (após auditoria/aprovação)
 * ACJEF — Arquivo de Controle de Jornada para Efeitos Fiscais
 *
 * Layout simplificado, alinhado ao espírito da Portaria 671 mas não
 * certificado para fiscalização. Cada registro carrega NSR sequencial
 * e hash chain SHA-256 garantindo integridade.
 */

import { createHash } from "node:crypto";

const ZERO_HASH = "0".repeat(64);

export function pad(value: any, len: number, padChar = "0"): string {
  return String(value ?? "").slice(0, len).padStart(len, padChar);
}

export function padLeft(value: any, len: number, padChar = " "): string {
  return String(value ?? "").slice(0, len).padStart(len, padChar);
}

export function padRight(value: any, len: number, padChar = " "): string {
  return String(value ?? "").slice(0, len).padEnd(len, padChar);
}

export function fmtDateYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function fmtTimeHHMM(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}${m}`;
}

export function sanitizeDigits(s: string): string {
  return String(s ?? "").replace(/\D/g, "");
}

/**
 * Hash SHA-256 do registro encadeado: depende do hash do registro
 * anterior, garantindo integridade da cadeia.
 */
export function computeRecordHash(opts: {
  previousHash: string | null | undefined;
  nsr: number;
  employeeCpf: string;
  clockTimestampISO: string;
  type: "IN" | "OUT" | "ADJ";
}): string {
  const prev = opts.previousHash || ZERO_HASH;
  const payload = [prev, String(opts.nsr), sanitizeDigits(opts.employeeCpf), opts.clockTimestampISO, opts.type].join("|");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function sha256OfText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export interface AfdRecord {
  nsr: number;
  cpf: string;
  clockIn: Date;
  clockOut: Date | null;
  recordHash: string | null;
}

export interface AfdHeaderInfo {
  cnpj: string;
  razaoSocial: string;
  repId: string;
  periodStart: Date;
  periodEnd: Date;
  generatedAt?: Date;
}

/**
 * Gera arquivo AFD (texto puro, uma linha por registro). Cada linha
 * termina com \r\n conforme espírito da Portaria.
 */
export function buildAfd(header: AfdHeaderInfo, records: AfdRecord[]): string {
  const generatedAt = header.generatedAt ?? new Date();
  const lines: string[] = [];

  // Header (tipo "1") — NSR + tipo + tipoIdent + identificador + razao + repId + dtIni + dtFim + dtGeracao + hrGeracao + versao
  let nsr = 1;
  lines.push(
    [
      pad(nsr++, 9),
      "1",
      "1", // 1 = CNPJ
      pad(sanitizeDigits(header.cnpj), 14),
      padRight(header.razaoSocial, 150),
      padRight(header.repId, 17),
      fmtDateYYYYMMDD(header.periodStart),
      fmtDateYYYYMMDD(header.periodEnd),
      fmtDateYYYYMMDD(generatedAt),
      fmtTimeHHMM(generatedAt),
      "001",
    ].join("")
  );

  let totalMarc = 0;
  for (const r of records) {
    if (r.clockIn) {
      lines.push(buildMarcacaoLine(r.nsr, r.clockIn, r.cpf, r.recordHash));
      totalMarc++;
    }
    if (r.clockOut) {
      lines.push(buildMarcacaoLine(r.nsr, r.clockOut, r.cpf, r.recordHash));
      totalMarc++;
    }
  }

  // Trailer (tipo "9") — totalizador
  lines.push(
    [
      pad(nsr, 9),
      "9",
      pad(totalMarc, 9),
      pad(0, 9), // ajustes
      pad(0, 9), // eventos REP
      pad(totalMarc + 2, 9), // total geral (header + marcações + trailer)
    ].join("")
  );

  return lines.join("\r\n") + "\r\n";
}

function buildMarcacaoLine(nsr: number, clock: Date, cpf: string, hash: string | null): string {
  // Tipo "7" — marcação Portaria 671
  return [
    pad(nsr, 9),
    "7",
    fmtDateYYYYMMDD(clock),
    fmtTimeHHMM(clock),
    pad(sanitizeDigits(cpf), 12),
    padRight(hash ?? "", 64),
  ].join("");
}

/**
 * Gera AFDT — versão "tratada" do AFD. Inclui apenas marcações
 * APROVADAS, com flag de ajuste quando houve alteração.
 */
export interface AfdtRecord extends AfdRecord {
  status: "APPROVED" | "PENDING" | "REJECTED";
  wasAdjusted: boolean;
  hoursWorked?: number;
}

export function buildAfdt(header: AfdHeaderInfo, records: AfdtRecord[]): string {
  const approved = records.filter((r) => r.status === "APPROVED");
  const lines: string[] = [];
  lines.push(
    [
      "AFDT - Arquivo Fonte de Dados Tratado",
      `Empregador: ${header.razaoSocial} (CNPJ ${header.cnpj})`,
      `Período: ${fmtDateYYYYMMDD(header.periodStart)} a ${fmtDateYYYYMMDD(header.periodEnd)}`,
      `REP-ID: ${header.repId}`,
      `Geração: ${(header.generatedAt ?? new Date()).toISOString()}`,
      "",
      "NSR;Data;HoraEntrada;HoraSaida;CPF;HorasTrabalhadas;Ajustado;HashRegistro",
    ].join("\r\n")
  );
  for (const r of approved) {
    lines.push(
      [
        pad(r.nsr, 9),
        fmtDateYYYYMMDD(r.clockIn),
        fmtTimeHHMM(r.clockIn),
        r.clockOut ? fmtTimeHHMM(r.clockOut) : "----",
        pad(sanitizeDigits(r.cpf), 11),
        (r.hoursWorked ?? 0).toFixed(2),
        r.wasAdjusted ? "S" : "N",
        r.recordHash ?? "",
      ].join(";")
    );
  }
  return lines.join("\r\n") + "\r\n";
}

/**
 * ACJEF — totais por funcionário/dia: jornada esperada, realizada,
 * extra, banco horas, atrasos.
 */
export interface AcjefRow {
  cpf: string;
  fullName: string;
  date: string; // YYYY-MM-DD
  expectedMinutes: number;
  workedMinutes: number;
  delayMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  hourBankMinutes: number; // signed: +crédito, -débito
}

export function buildAcjef(header: AfdHeaderInfo, rows: AcjefRow[]): string {
  const lines: string[] = [];
  lines.push(
    [
      "ACJEF - Arquivo de Controle de Jornada para Efeitos Fiscais",
      `Empregador: ${header.razaoSocial} (CNPJ ${header.cnpj})`,
      `Período: ${fmtDateYYYYMMDD(header.periodStart)} a ${fmtDateYYYYMMDD(header.periodEnd)}`,
      `REP-ID: ${header.repId}`,
      `Geração: ${(header.generatedAt ?? new Date()).toISOString()}`,
      "",
      "CPF;Nome;Data;EsperadoMin;RealizadoMin;AtrasoMin;HEMin;NoturnoMin;BancoHorasMin",
    ].join("\r\n")
  );
  for (const r of rows) {
    lines.push(
      [
        pad(sanitizeDigits(r.cpf), 11),
        padRight(r.fullName, 50, " ").trimEnd(),
        r.date.replace(/-/g, ""),
        r.expectedMinutes,
        r.workedMinutes,
        r.delayMinutes,
        r.overtimeMinutes,
        r.nightMinutes,
        r.hourBankMinutes,
      ].join(";")
    );
  }
  return lines.join("\r\n") + "\r\n";
}
