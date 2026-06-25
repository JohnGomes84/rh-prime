import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateVacationRequest,
  VacationRequestInput,
  VacationValidationResult,
} from './vacation-rules.js';

/**
 * CLT vacation validation rules (Art. 134, 135, 143).
 */
describe('validateVacationRequest', () => {
  // Fix "today" so the 30-day notice tests are deterministic.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Helper: build a valid baseline request (30 days, starting 45 days out). */
  function baseRequest(overrides: Partial<VacationRequestInput> = {}): VacationRequestInput {
    const start = new Date('2026-08-15'); // 45 days from fake "today"
    const end = new Date('2026-09-13');   // 30 calendar days
    return {
      daysEntitled: 30,
      daysTaken: 0,
      existingPeriods: [],
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      days: 30,
      abonoDays: 0,
      ...overrides,
    };
  }

  it('accepts a valid 30-day request', () => {
    const result = validateVacationRequest(baseRequest());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects when days exceed remaining balance', () => {
    const result = validateVacationRequest(
      baseRequest({ daysEntitled: 30, daysTaken: 10, days: 25 }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /saldo/i.test(e) || /balance/i.test(e) || /exceed/i.test(e))).toBe(true);
  });

  it('rejects a fraction shorter than 5 days', () => {
    const result = validateVacationRequest(
      baseRequest({ days: 4 }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /5/i.test(e))).toBe(true);
  });

  it('rejects a 4th fraction (max 3 per period)', () => {
    const result = validateVacationRequest(
      baseRequest({
        existingPeriods: [{ days: 14 }, { days: 5 }, { days: 5 }],
        daysTaken: 24,
        days: 6,
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /3|frac/i.test(e))).toBe(true);
  });

  it('rejects if no fraction has at least 14 days', () => {
    const result = validateVacationRequest(
      baseRequest({
        existingPeriods: [{ days: 10 }],
        daysTaken: 10,
        days: 10,
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /14/i.test(e))).toBe(true);
  });

  it('accepts when one existing fraction is 14+ days', () => {
    const result = validateVacationRequest(
      baseRequest({
        existingPeriods: [{ days: 15 }],
        daysTaken: 15,
        days: 10,
      }),
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects abono exceeding 1/3 of entitled days', () => {
    // 1/3 of 30 = 10; requesting 11
    const result = validateVacationRequest(
      baseRequest({ days: 19, abonoDays: 11 }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /abono|1\/3/i.test(e))).toBe(true);
  });

  it('accepts abono of exactly 10 days on 30 entitled', () => {
    const result = validateVacationRequest(
      baseRequest({ days: 20, abonoDays: 10 }),
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects start date less than 30 days from now', () => {
    const result = validateVacationRequest(
      baseRequest({
        startDate: '2026-07-20', // only 19 days from fake today (Jul 1)
        endDate: '2026-08-18',
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /30 dias|30 days|antecedência|notice/i.test(e))).toBe(true);
  });
});
