import dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });
process.env.NODE_ENV ||= "production";

const { reconcileOrphanStorage } = await import(
  "../server/jobs/reconcile-orphan-storage.ts"
);

try {
  await reconcileOrphanStorage();
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
