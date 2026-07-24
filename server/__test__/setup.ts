import { vi, beforeEach } from "vitest";
import { memoryDb } from "./db-mock.js";

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-secret-test-secret-test-secret-32+chars";
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}

vi.mock("../db", async () => {
  const actual = await vi.importActual<any>("../db").catch(() => ({}));
  return {
    ...actual,
    getDb: memoryDb.getDb,
    getUser: memoryDb.getUser.bind(memoryDb),
    getUserById: memoryDb.getUserById.bind(memoryDb),
    getUserByOpenId: memoryDb.getUserByOpenId.bind(memoryDb),
    createUser: memoryDb.createUser.bind(memoryDb),
    updateUser: memoryDb.updateUser.bind(memoryDb),
    deleteUser: memoryDb.deleteUser.bind(memoryDb),
    upsertUser: memoryDb.upsertUser.bind(memoryDb),
    listUsers: memoryDb.listUsers.bind(memoryDb),
    getUsersByRole: memoryDb.getUsersByRole.bind(memoryDb),
    getUsersByDepartment: memoryDb.getUsersByDepartment.bind(memoryDb),
    createNotification: memoryDb.createNotification.bind(memoryDb),
    listEmployees: memoryDb.listEmployees.bind(memoryDb),
    getEmployee: memoryDb.getEmployee.bind(memoryDb),
    createEmployee: memoryDb.createEmployee.bind(memoryDb),
    updateEmployee: memoryDb.updateEmployee.bind(memoryDb),
    deleteEmployee: memoryDb.deleteEmployee.bind(memoryDb),
    createTimeRecord: memoryDb.createTimeRecord.bind(memoryDb),
    listTimeRecords: memoryDb.listTimeRecords.bind(memoryDb),
    getMonthlyTimeSummary: memoryDb.getMonthlyTimeSummary.bind(memoryDb),
    createOvertimeRequest: memoryDb.createOvertimeRequest.bind(memoryDb),
    listOvertimeRequests: memoryDb.listOvertimeRequests.bind(memoryDb),
    updateOvertimeRequest: memoryDb.updateOvertimeRequest.bind(memoryDb),
    getOvertimeStats: memoryDb.getOvertimeStats.bind(memoryDb),
    getOpenTimeRecord: memoryDb.getOpenTimeRecord.bind(memoryDb),
    updateTimeRecord: memoryDb.updateTimeRecord.bind(memoryDb),
    listContracts: memoryDb.listContracts.bind(memoryDb),
    findOvertimeAuthorizationFor: memoryDb.findOvertimeAuthorizationFor.bind(memoryDb),
    consumeOvertimeAuthorization: memoryDb.consumeOvertimeAuthorization.bind(memoryDb),
    createTimeBankEntry: memoryDb.createTimeBankEntry.bind(memoryDb),
    getNextNsr: memoryDb.getNextNsr.bind(memoryDb),
    getLastRecordHash: memoryDb.getLastRecordHash.bind(memoryDb),
  };
});

beforeEach(() => {
  memoryDb.reset();
});
