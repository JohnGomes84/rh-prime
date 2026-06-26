export type ReportStatus = "rascunho" | "enviado" | "validado" | "devolvido";
export type ItemStatus = "pendente" | "em_andamento" | "concluido";

/** Atraso é derivado, nunca persistido: passou do prazo e ainda não validado. */
export function isOverdue(
  report: { dueDate: string; status: ReportStatus },
  now: Date = new Date(),
): boolean {
  if (report.status === "validado") return false;
  // dueDate "YYYY-MM-DD" → fim do dia do prazo
  const due = new Date(`${report.dueDate}T23:59:59Z`);
  return now.getTime() > due.getTime();
}

export interface ItemRollup {
  pendente: number;
  em_andamento: number;
  concluido: number;
  total: number;
}

export function itemRollup(items: Array<{ itemStatus: ItemStatus }>): ItemRollup {
  const r: ItemRollup = { pendente: 0, em_andamento: 0, concluido: 0, total: 0 };
  for (const it of items) {
    r[it.itemStatus] += 1;
    r.total += 1;
  }
  return r;
}
