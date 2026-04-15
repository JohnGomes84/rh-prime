import dotenv from "dotenv";

dotenv.config({ path: ".env.homolog", override: true });
process.env.NODE_ENV = "homologation";

const { runDashboardDemoSeed } = await import("../server/lib/seed-dashboard-demo.ts");

runDashboardDemoSeed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[SEED:DEMO:HOMOLOG] Failed:", error);
    process.exit(1);
  });
