import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetScript = process.argv[2];

if (!targetScript) {
  console.error("[supervisor] Missing target script argument.");
  process.exit(1);
}

const resolvedTarget = path.resolve(__dirname, targetScript);
const maxRestarts = Number.parseInt(process.env.MAX_RESTARTS || "5", 10);
const restartDelayMs = Number.parseInt(process.env.RESTART_DELAY_MS || "2000", 10);
const stableUptimeMs = Number.parseInt(process.env.STABLE_UPTIME_MS || "15000", 10);

let restartCount = 0;
let shuttingDown = false;
let child = null;
let stableTimer = null;

const stopSignals = ["SIGINT", "SIGTERM"];

function shouldRestart(code, signal) {
  if (shuttingDown) return false;
  if (signal) return true;
  return code !== 0;
}

function startChild() {
  if (stableTimer) {
    clearTimeout(stableTimer);
    stableTimer = null;
  }

  child = spawn(process.execPath, [resolvedTarget], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  stableTimer = setTimeout(() => {
    restartCount = 0;
    stableTimer = null;
  }, stableUptimeMs);

  child.on("exit", (code, signal) => {
    child = null;
    if (stableTimer) {
      clearTimeout(stableTimer);
      stableTimer = null;
    }

    if (!shouldRestart(code, signal)) {
      process.exit(code ?? 0);
      return;
    }

    restartCount += 1;
    if (restartCount > maxRestarts) {
      console.error(
        `[supervisor] Restart limit reached (${maxRestarts}). Last exit code: ${code ?? "null"}, signal: ${signal ?? "none"}`
      );
      process.exit(code ?? 1);
      return;
    }

    console.error(
      `[supervisor] Child exited (code=${code ?? "null"}, signal=${signal ?? "none"}). Restarting in ${restartDelayMs}ms... [${restartCount}/${maxRestarts}]`
    );

    setTimeout(startChild, restartDelayMs);
  });
}

for (const signal of stopSignals) {
  process.on(signal, () => {
    shuttingDown = true;
    if (stableTimer) {
      clearTimeout(stableTimer);
      stableTimer = null;
    }
    if (child && !child.killed) {
      child.kill(signal);
      return;
    }
    process.exit(0);
  });
}

startChild();
