import { and, eq, lte } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { storageCleanupJobs } from "../../drizzle/schema";
import { getDb } from "../db";
import { getStorageBackend } from "../lib/document-storage";

export async function processStorageCleanupJobs() {
  const db = await getDb();
  if (!db) return;

  const jobs = await db
    .select()
    .from(storageCleanupJobs)
    .where(
      and(
        eq(storageCleanupJobs.status, "pending"),
        lte(storageCleanupJobs.notBefore, new Date())
      )
    )
    .limit(20);

  for (const job of jobs) {
    try {
      await getStorageBackend(job.backend).delete(job.storageKey);

      await db
        .update(storageCleanupJobs)
        .set({
          status: "completed",
          attempts: job.attempts + 1,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(storageCleanupJobs.id, job.id));
    } catch (error) {
      const attempts = job.attempts + 1;

      await db
        .update(storageCleanupJobs)
        .set({
          status: attempts >= 5 ? "failed" : "pending",
          attempts,
          lastError: error instanceof Error ? error.message : String(error),
          notBefore: new Date(Date.now() + attempts * 60_000),
          updatedAt: new Date(),
        })
        .where(eq(storageCleanupJobs.id, job.id));
    }
  }
}
