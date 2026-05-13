/**
 * Mascaramento de campos sensíveis por contexto.
 * Aplicado em respostas tRPC antes de enviar ao cliente.
 *
 * Regras (default):
 * - admin: full access
 * - próprio funcionário: full access
 * - outros (gestor/colaborador olhando outro empregado): mascarado
 */

export type ViewerRole = "admin" | "gestor" | "colaborador" | "user" | null | undefined;

export function maskCpf(cpf: string | null | undefined): string | null | undefined {
  if (!cpf) return cpf;
  const digits = String(cpf).replace(/\D/g, "");
  if (digits.length < 4) return "***";
  const last2 = digits.slice(-2);
  return `***.***.***-${last2}`;
}

export function maskRg(rg: string | null | undefined): string | null | undefined {
  if (!rg) return rg;
  const s = String(rg);
  if (s.length < 3) return "***";
  return `${"*".repeat(Math.max(1, s.length - 2))}${s.slice(-2)}`;
}

export function maskEmail(email: string | null | undefined): string | null | undefined {
  if (!email) return email;
  const [local, domain] = String(email).split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.max(1, Math.min(2, local.length)));
  return `${visible}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string | null | undefined {
  if (!phone) return phone;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `(**) ****-${digits.slice(-4)}`;
}

export interface MaskOptions {
  viewerRole: ViewerRole;
  viewerEmployeeId?: number | null;
  fields?: Array<"cpf" | "rg" | "email" | "phone" | "salary" | "address" | "bank" | "pis">;
}

/**
 * Decide se o viewer tem acesso full aos dados de um employee.
 * Admin sempre. Próprio sempre. Outros: não.
 */
export function canSeeFullEmployee(employeeId: number, opts: MaskOptions): boolean {
  if (opts.viewerRole === "admin") return true;
  if (opts.viewerEmployeeId && opts.viewerEmployeeId === employeeId) return true;
  return false;
}

/**
 * Aplica mascaramento em um objeto employee (single ou array).
 * Não muta — retorna cópia.
 */
export function applyEmployeeMask<T extends Record<string, any>>(
  employee: T,
  opts: MaskOptions
): T {
  if (canSeeFullEmployee(employee.id, opts)) return employee;

  const out: any = { ...employee };
  out.cpf = maskCpf(employee.cpf);
  out.rg = maskRg(employee.rg);
  out.email = maskEmail(employee.email);
  out.phone = maskPhone(employee.phone);
  // Endereço e bancário escondidos para não-admin
  out.addressStreet = null;
  out.addressNumber = null;
  out.addressComplement = null;
  out.addressNeighborhood = null;
  out.addressZip = null;
  out.bankName = null;
  out.bankAgency = null;
  out.bankAccount = null;
  out.pixKey = null;
  out.pisPasep = null;
  return out;
}

export function applyEmployeeMaskList<T extends Record<string, any>>(
  list: T[],
  opts: MaskOptions
): T[] {
  return list.map((e) => applyEmployeeMask(e, opts));
}

export function applyContractMask<T extends Record<string, any>>(
  contract: T,
  opts: MaskOptions & { contractEmployeeId: number }
): T {
  if (canSeeFullEmployee(opts.contractEmployeeId, opts)) return contract;
  const out: any = { ...contract };
  out.salary = null;
  return out;
}
