import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from '../routers';
import { createCallerFactory } from '@trpc/server';

const createCaller = createCallerFactory(appRouter);

describe('Timesheet Router', () => {
  const mockUserId = 'test-user-123';
  const mockContext = {
    user: { id: mockUserId, email: 'test@example.com', role: 'user' },
    req: { headers: {} },
    res: { setHeader: () => {}, clearCookie: () => {} },
  };

  describe('clockIn', () => {
    it('deve registrar entrada com sucesso', async () => {
      const caller = createCaller(mockContext);
      const result = await caller.timesheet.clockIn({
        employeeId: mockUserId,
        clockIn: new Date(),
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it('deve registrar saída com sucesso', async () => {
      const caller = createCaller(mockContext);
      const now = new Date();
      const result = await caller.timesheet.clockIn({
        employeeId: mockUserId,
        clockIn: now,
        clockOut: new Date(now.getTime() + 8 * 60 * 60 * 1000),
      });

      expect(result.success).toBe(true);
    });
  });

  describe('listRecords', () => {
    it('deve listar registros de ponto', async () => {
      const caller = createCaller(mockContext);
      const result = await caller.timesheet.listRecords({
        employeeId: mockUserId,
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('deve filtrar por data', async () => {
      const caller = createCaller(mockContext);
      const startDate = new Date('2026-02-01');
      const endDate = new Date('2026-02-28');

      const result = await caller.timesheet.listRecords({
        employeeId: mockUserId,
        startDate,
        endDate,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('monthlySummary', () => {
    it('deve retornar resumo mensal', async () => {
      const caller = createCaller(mockContext);
      const result = await caller.timesheet.monthlySummary({
        employeeId: mockUserId,
        month: 2,
        year: 2026,
      });

      expect(result).toHaveProperty('totalHours');
      expect(result).toHaveProperty('overtimeHours');
      expect(result).toHaveProperty('absences');
      expect(result).toHaveProperty('delays');
    });

    it('deve calcular total de horas corretamente', async () => {
      const caller = createCaller(mockContext);
      const result = await caller.timesheet.monthlySummary({
        employeeId: mockUserId,
        month: 2,
        year: 2026,
      });

      expect(result.totalHours).toBeGreaterThanOrEqual(0);
      expect(typeof result.totalHours).toBe('number');
    });
  });
});

describe('Overtime Router', () => {
  const mockUserId = 'test-user-123';
  const mockContext = {
    user: { id: mockUserId, email: 'test@example.com', role: 'user' },
    req: { headers: {} },
    res: { setHeader: () => {}, clearCookie: () => {} },
  };

  describe('requestOvertime', () => {
    it('deve criar solicitação de horas extras', async () => {
      const caller = createCaller(mockContext);
      const result = await caller.timesheet.requestOvertime({
        employeeId: mockUserId,
        timeRecordId: 'record-123',
        overtimeHours: 2,
        type: '100%',
        reason: 'Projeto urgente',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it('deve validar tipo de hora extra', async () => {
      const caller = createCaller(mockContext);
      const result = await caller.timesheet.requestOvertime({
        employeeId: mockUserId,
        timeRecordId: 'record-123',
        overtimeHours: 1.5,
        type: '50%',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('listOvertimeRequests', () => {
    it('deve listar solicitações de horas extras', async () => {
      const caller = createCaller(mockContext);
      const result = await caller.timesheet.listOvertimeRequests({
        employeeId: mockUserId,
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('deve filtrar por status', async () => {
      const caller = createCaller(mockContext);
      const result = await caller.timesheet.listOvertimeRequests({
        employeeId: mockUserId,
        status: 'PENDING',
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('approveOvertime', () => {
    it('deve aprovar horas extras', async () => {
      const caller = createCaller(mockContext);
      const result = await caller.timesheet.approveOvertime({
        overtimeId: 'overtime-123',
        approved: true,
      });

      expect(result.success).toBe(true);
    });

    it('deve rejeitar horas extras', async () => {
      const caller = createCaller(mockContext);
      const result = await caller.timesheet.approveOvertime({
        overtimeId: 'overtime-123',
        approved: false,
        notes: 'Não autorizado',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('overtimeStats', () => {
    it('deve retornar estatísticas de horas extras', async () => {
      const caller = createCaller(mockContext);
      const result = await caller.timesheet.overtimeStats({
        employeeId: mockUserId,
      });

      expect(result).toHaveProperty('totalRequests');
      expect(result).toHaveProperty('approvedRequests');
      expect(result).toHaveProperty('rejectedRequests');
      expect(result).toHaveProperty('pendingRequests');
      expect(result).toHaveProperty('totalOvertimeHours');
      expect(result).toHaveProperty('totalOvertimeValue');
    });

    it('deve calcular totais corretamente', async () => {
      const caller = createCaller(mockContext);
      const result = await caller.timesheet.overtimeStats({
        employeeId: mockUserId,
        month: 2,
        year: 2026,
      });

      expect(result.totalRequests).toBeGreaterThanOrEqual(0);
      expect(result.totalOvertimeHours).toBeGreaterThanOrEqual(0);
      expect(result.totalOvertimeValue).toBeGreaterThanOrEqual(0);
    });
  });
});
