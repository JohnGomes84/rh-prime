import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

dotenv.config({ path: ".env.homolog", override: true });

const run = (args) => {
  const result = spawnSync("node", ["./node_modules/drizzle-kit/bin.cjs", ...args], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run(["push"]);
