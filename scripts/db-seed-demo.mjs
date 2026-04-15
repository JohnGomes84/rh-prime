import { runDashboardDemoSeed } from "../server/lib/seed-dashboard-demo.ts";

runDashboardDemoSeed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[SEED:DEMO] Failed:", error);
    process.exit(1);
  });
