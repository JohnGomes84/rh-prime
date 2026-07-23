/**
 * In-memory DB used by vitest setup. Mocks just enough of `server/db.ts`
 * to make pure-logic + auth tests pass without a real MySQL connection.
 */

type User = {
  id: number;
  email: string;
  passwordHash: string | null;
  name: string | null;
  role: string;
  loginMethod: string | null;
  openId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Employee = {
  id: number;
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  educationLevel: string;
  addressStreet: string;
  addressNumber: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  status: string;
};

type TimeRecord = {
  id: number;
  employeeId: number;
  clockIn: Date;
  clockOut?: Date;
  location?: string;
  notes?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type OvertimeRecord = {
  id: number;
  employeeId: number;
  timeRecordId: number;
  overtimeHours: number;
  type: "50%" | "100%" | "NOTURNO";
  reason?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedAt?: Date;
  approvedById?: number;
  notes?: string;
};

const users = new Map<number, User>();
const employees = new Map<number, Employee>();
const timeRecords = new Map<number, TimeRecord>();
const overtimeRecords = new Map<number, OvertimeRecord>();
let nextId = 1;
let nextEmployeeId = 1;
let nextTimeRecordId = 1;
let nextOvertimeId = 1;

const reset = () => {
  users.clear();
  employees.clear();
  timeRecords.clear();
  overtimeRecords.clear();
  nextId = 1;
  nextEmployeeId = 1;
  nextTimeRecordId = 1;
  nextOvertimeId = 1;
};

export const memoryDb = {
  reset,

  async getUser(email: string) {
    for (const u of users.values()) if (u.email === email) return u;
    return null;
  },
  async getUserById(id: number) {
    return users.get(id) ?? null;
  },
  async getUserByOpenId(openId: string) {
    for (const u of users.values()) if (u.openId === openId) return u;
    return null;
  },
  async createUser(data: any) {
    const id = nextId++;
    const u: User = {
      id,
      email: data.email,
      passwordHash: data.passwordHash ?? null,
      name: data.name ?? null,
      role: data.role ?? "colaborador",
      loginMethod: data.loginMethod ?? "jwt",
      openId: data.openId ?? null,
      resetToken: null,
      resetTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.set(id, u);
    return u;
  },
  async updateUser(id: number, data: Partial<User>) {
    const u = users.get(id);
    if (!u) return null;
    Object.assign(u, data, { updatedAt: new Date() });
    users.set(id, u);
    return u;
  },
  async deleteUser(id: number) {
    users.delete(id);
    return { success: true };
  },
  async upsertUser(data: any) {
    const existing = await this.getUser(data.email);
    if (existing) return this.updateUser(existing.id, data);
    return this.createUser(data);
  },
  async listUsers() {
    return Array.from(users.values());
  },
  async getUsersByRole(role: string) {
    return Array.from(users.values()).filter(u => u.role === role);
  },
  async getUsersByDepartment(_id: string) {
    return [];
  },
  async createNotification(_data: any) {
    return { id: 1 };
  },
  async listEmployees(search?: string) {
    const list = Array.from(employees.values());
    if (!search) return list;
    const normalized = search.toLowerCase();
    return list.filter(employee => employee.fullName.toLowerCase().includes(normalized));
  },
  async getEmployee(id: number) {
    return employees.get(id) ?? null;
  },
  async createEmployee(data: any) {
    const duplicateCpf = Array.from(employees.values()).find(employee => employee.cpf === data.cpf);
    if (duplicateCpf) throw new Error("Duplicate CPF");
    const duplicateEmail = Array.from(employees.values()).find(employee => employee.email === data.email);
    if (duplicateEmail) throw new Error("Duplicate email");

    const employee: Employee = {
      id: nextEmployeeId++,
      fullName: data.fullName,
      cpf: data.cpf,
      email: data.email,
      phone: data.phone,
      birthDate: data.birthDate,
      gender: data.gender,
      maritalStatus: data.maritalStatus,
      nationality: data.nationality,
      educationLevel: data.educationLevel,
      addressStreet: data.addressStreet,
      addressNumber: data.addressNumber,
      addressNeighborhood: data.addressNeighborhood,
      addressCity: data.addressCity,
      addressState: data.addressState,
      addressZip: data.addressZip,
      status: data.status ?? "Ativo",
    };
    employees.set(employee.id, employee);
    return employee;
  },
  async updateEmployee(id: number, data: Record<string, unknown>) {
    const current = employees.get(id);
    if (!current) return null;
    const updated = { ...current, ...data };
    employees.set(id, updated);
    return updated;
  },
  async deleteEmployee(id: number) {
    employees.delete(id);
    return { success: true };
  },
  async createTimeRecord(data: any) {
    const record: TimeRecord = {
      id: nextTimeRecordId++,
      employeeId: data.employeeId,
      clockIn: data.clockIn,
      clockOut: data.clockOut,
      location: data.location,
      notes: data.notes,
      status: "PENDING",
    };
    timeRecords.set(record.id, record);
    return { success: true, id: record.id };
  },
  async getOpenTimeRecord(employeeId: number) {
    const now = new Date();
    const competenceStart = now.getDate() >= 26
      ? new Date(now.getFullYear(), now.getMonth(), 26, 0, 0, 0, 0)
      : new Date(now.getFullYear(), now.getMonth() - 1, 26, 0, 0, 0, 0);
    const competenceEnd = now.getDate() >= 26
      ? new Date(now.getFullYear(), now.getMonth() + 1, 25, 23, 59, 59, 999)
      : new Date(now.getFullYear(), now.getMonth(), 25, 23, 59, 59, 999);
    const currentDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const currentDayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const recs = Array.from(timeRecords.values())
      .filter((r) =>
        r.employeeId === employeeId
        && !r.clockOut
        && r.clockIn >= competenceStart
        && r.clockIn <= competenceEnd
        && r.clockIn >= currentDayStart
        && r.clockIn <= currentDayEnd
      )
      .sort((a, b) => b.clockIn.getTime() - a.clockIn.getTime());
    return recs[0] ?? null;
  },
  async updateTimeRecord(id: number, data: Record<string, any>) {
    const r = timeRecords.get(id);
    if (!r) return { success: false };
    timeRecords.set(id, { ...r, ...data, updatedAt: new Date() });
    return { success: true };
  },
  async findOvertimeAuthorizationFor(_employeeId: number, _date: string) {
    return null;
  },
  async consumeOvertimeAuthorization(_id: number) {
    return;
  },
  async createTimeBankEntry(_data: any) {
    return { id: 1 };
  },
  async getNextNsr() {
    return Array.from(timeRecords.values()).length + 1;
  },
  async getLastRecordHash() {
    return null;
  },
  async listTimeRecords(employeeId: number, startDate?: Date, endDate?: Date) {
    return Array.from(timeRecords.values()).filter(record => {
      if (record.employeeId !== employeeId) return false;
      if (startDate && record.clockIn < startDate) return false;
      if (endDate && record.clockIn > endDate) return false;
      return true;
    });
  },
  async getMonthlyTimeSummary(employeeId: number, month: number, year: number) {
    const monthlyRecords = Array.from(timeRecords.values()).filter(record => {
      return (
        record.employeeId === employeeId &&
        record.clockIn.getMonth() + 1 === month &&
        record.clockIn.getFullYear() === year
      );
    });

    const totalHours = monthlyRecords.reduce((sum, record) => {
      if (!record.clockOut) return sum;
      return sum + (record.clockOut.getTime() - record.clockIn.getTime()) / 3_600_000;
    }, 0);

    return {
      totalHours,
      overtimeHours: 0,
      absences: 0,
      delays: 0,
    };
  },
  async createOvertimeRequest(data: any) {
    const record: OvertimeRecord = {
      id: nextOvertimeId++,
      employeeId: data.employeeId,
      timeRecordId: data.timeRecordId,
      overtimeHours: data.overtimeHours,
      type: data.type,
      reason: data.reason,
      status: "PENDING",
    };
    overtimeRecords.set(record.id, record);
    return { success: true, id: record.id };
  },
  async listOvertimeRequests(employeeId?: number, status?: "PENDING" | "APPROVED" | "REJECTED") {
    return Array.from(overtimeRecords.values()).filter(record => {
      if (employeeId !== undefined && record.employeeId !== employeeId) return false;
      if (status && record.status !== status) return false;
      return true;
    });
  },
  async updateOvertimeRequest(id: number, data: Record<string, unknown>) {
    const current = overtimeRecords.get(id);
    if (!current) return { success: false };
    const updated = { ...current, ...data };
    overtimeRecords.set(id, updated);
    return { success: true, id };
  },
  async getOvertimeStats(employeeId?: number, month?: number, year?: number) {
    const filtered = Array.from(overtimeRecords.values()).filter(record => {
      if (employeeId !== undefined && record.employeeId !== employeeId) return false;
      if (!month && !year) return true;
      const related = timeRecords.get(record.timeRecordId);
      if (!related) return false;
      if (month && related.clockIn.getMonth() + 1 !== month) return false;
      if (year && related.clockIn.getFullYear() !== year) return false;
      return true;
    });
    const approved = filtered.filter(record => record.status === "APPROVED");
    const rejected = filtered.filter(record => record.status === "REJECTED");
    const pending = filtered.filter(record => record.status === "PENDING");
    const totalOvertimeHours = filtered.reduce((sum, record) => sum + record.overtimeHours, 0);

    return {
      totalRequests: filtered.length,
      approvedRequests: approved.length,
      rejectedRequests: rejected.length,
      pendingRequests: pending.length,
      totalOvertimeHours,
      totalOvertimeValue: totalOvertimeHours,
    };
  },
  async getDb() {
    return null;
  },
};

export type MemoryDb = typeof memoryDb;
