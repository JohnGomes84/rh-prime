import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { ENV } from "./env.js";
import { startNotificationScheduler } from "./notification-scheduler.js";
import { createConfiguredApp } from "./app.js";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const server = createServer();
  const app = await createConfiguredApp({ server, serveClient: true });
  server.on("request", app);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`WebSocket available at ws://localhost:${port}/api/ws`);
    if (!ENV.isTest) startNotificationScheduler();
  });
}

startServer().catch(console.error);
