import { eq } from "drizzle-orm";
import { employees, users, workSchedules, shifts } from "../../../drizzle/schema";
import { getDb } from "../../db";

export type PortalUserContext = {
  user: {
    id: number;
    role: string;
    email?: string | null;
  };
};

export type ScheduleRow = typeof workSchedules.$inferSelect;
export type OccurrenceRow = { scheduleId: number; resolved: boolean; [key: string]: unknown };

export type LeaderScheduleSummary = ScheduleRow & {
  clientName: string;
  shiftName: string;
  unitName: string;
  allocationsCount: number;
  occurrencesCount: number;
};

export async function isLeaderOfSchedule(userId: number, scheduleId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [schedule] = await db.select().from(workSchedules).where(eq(workSchedules.id, scheduleId)).limit(1);
  if (!schedule) return false;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (user?.role === "admin") return true;

  if (!schedule.leaderId) return false;

  const [leaderEmp] = await db.select().from(employees).where(eq(employees.id, schedule.leaderId)).limit(1);
  if (!leaderEmp) return false;

  return user?.email === leaderEmp.email || false;
}

export async function getScheduleWithShift(scheduleId: number) {
  const db = await getDb();
  if (!db) return { schedule: null, shift: null };

  const [schedule] = await db.select().from(workSchedules).where(eq(workSchedules.id, scheduleId)).limit(1);
  if (!schedule || !schedule.shiftId) return { schedule: schedule || null, shift: null };

  const [shift] = await db.select().from(shifts).where(eq(shifts.id, schedule.shiftId)).limit(1);
  return { schedule, shift: shift || null };
}
