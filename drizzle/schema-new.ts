// Adicionar ao final do schema.ts existente:

// ============================================================
// TIME RECORDS (Registros de Ponto)
// ============================================================
export const timeRecords = mysqlTable("time_records", {
  id: varchar("id", { length: 36 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 36 })
    .notNull()
    .references(() => employees.id, { onDelete: "cascade", onUpdate: "cascade" }),
  clockIn: datetime("clock_in").notNull(),
  clockOut: datetime("clock_out"),
  hoursWorked: decimal("hours_worked", { precision: 6, scale: 2 }),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED"]).default("PENDING").notNull(),
  approvedById: varchar("approved_by_id", { length: 36 }).references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  approvedAt: datetime("approved_at"),
  updatedById: varchar("updated_by_id", { length: 36 }).references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  createdAt: datetime("created_at").defaultNow().notNull(),
  updatedAt: datetime("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  employeeClockInIdx: index("idx_time_employee_clockin").on(table.employeeId, table.clockIn),
  employeeStatusIdx: index("idx_time_employee_status").on(table.employeeId, table.status),
  clockInIdx: index("idx_time_clockin").on(table.clockIn),
}));

export type TimeRecord = typeof timeRecords.$inferSelect;
export type InsertTimeRecord = typeof timeRecords.$inferInsert;

// ============================================================
// OVERTIME RECORDS (Registros de Horas Extras)
// ============================================================
export const overtimeRecords = mysqlTable("overtime_records", {
  id: varchar("id", { length: 36 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 36 })
    .notNull()
    .references(() => employees.id, { onDelete: "cascade", onUpdate: "cascade" }),
  timeRecordId: varchar("time_record_id", { length: 36 })
    .notNull()
    .references(() => timeRecords.id, { onDelete: "cascade", onUpdate: "cascade" }),
  hoursWorked: decimal("hours_worked", { precision: 6, scale: 2 }).notNull(),
  overtimeHours: decimal("overtime_hours", { precision: 6, scale: 2 }).notNull(),
  multiplier: decimal("multiplier", { precision: 3, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["50%", "100%", "NOTURNO"]).notNull(),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED"]).default("PENDING").notNull(),
  approvedById: varchar("approved_by_id", { length: 36 }).references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  approvedAt: datetime("approved_at"),
  updatedById: varchar("updated_by_id", { length: 36 }).references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  notes: varchar("notes", { length: 500 }),
  createdAt: datetime("created_at").defaultNow().notNull(),
  updatedAt: datetime("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  employeeStatusIdx: index("idx_ot_employee_status").on(table.employeeId, table.status),
  timeRecordIdx: index("idx_ot_timerecord").on(table.timeRecordId),
  typeIdx: index("idx_ot_type").on(table.type),
  employeeCreatedIdx: index("idx_ot_employee_created").on(table.employeeId, table.createdAt),
}));

export type OvertimeRecord = typeof overtimeRecords.$inferSelect;
export type InsertOvertimeRecord = typeof overtimeRecords.$inferInsert;
