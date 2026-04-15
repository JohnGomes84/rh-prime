import dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });
process.env.NODE_ENV ||= "production";

const { processStorageCleanupJobs } = await import(
  "../server/jobs/process-storage-cleanup-jobs.ts"
);

try {
  await processStorageCleanupJobs();
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
