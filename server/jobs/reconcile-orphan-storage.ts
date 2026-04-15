import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { documentVersions, storageCleanupJobs } from "../../drizzle/schema";
import { getDb } from "../db";
import { getStorageBackend, LocalStorageBackend } from "../lib/document-storage";

export async function reconcileOrphanStorage() {
  const db = await getDb();
  if (!db) return;

  const backend = getStorageBackend("local");
  if (!(backend instanceof LocalStorageBackend)) {
    return;
  }

  const keys = await backend.listKeys("documents");

  for (const storageKey of keys) {
    const existing = await db
      .select({ id: documentVersions.id })
      .from(documentVersions)
      .where(eq(documentVersions.storageKey, storageKey))
      .limit(1);

    if (existing[0]) continue;

    try {
      await backend.delete(storageKey);
    } catch (error) {
      await db.insert(storageCleanupJobs).values({
        id: randomUUID(),
        storageKey,
        backend: "local",
        status: "pending",
        reason: "reconcile_orphan_storage_failed",
        lastError: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
