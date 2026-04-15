import dotenv from "dotenv";

dotenv.config({ path: ".env.homolog", override: true });
process.env.NODE_ENV = "homologation";

await import("./dev-server.mjs");
