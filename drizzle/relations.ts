import { relations } from "drizzle-orm/relations";
import { employees, overtimeRecords, timeRecords } from "./schema";

export const overtimeRecordsRelations = relations(overtimeRecords, ({one}) => ({
	employee: one(employees, {
		fields: [overtimeRecords.employeeId],
		references: [employees.id]
	}),
	timeRecord: one(timeRecords, {
		fields: [overtimeRecords.timeRecordId],
		references: [timeRecords.id]
	}),
}));

export const employeesRelations = relations(employees, ({many}) => ({
	overtimeRecords: many(overtimeRecords),
	timeRecords: many(timeRecords),
}));

export const timeRecordsRelations = relations(timeRecords, ({one, many}) => ({
	overtimeRecords: many(overtimeRecords),
	employee: one(employees, {
		fields: [timeRecords.employeeId],
		references: [employees.id]
	}),
}));