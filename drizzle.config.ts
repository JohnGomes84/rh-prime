import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config();

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// drizzle-kit doesn't handle ssl={...} in the URL — parse and use individual fields
const cleanUrl = rawUrl.replace(/[?&]ssl=\{[^}]*\}/, "");
const needsTls = /tidbcloud\.com/i.test(rawUrl);

function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "3306"),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
  };
}

export default defineConfig({
  schema: ["./drizzle/schema.ts", "./drizzle/schema-kanban.ts"],
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: needsTls
    ? { ...parseDbUrl(cleanUrl), ssl: { rejectUnauthorized: true, minVersion: "TLSv1.2" } }
    : { url: cleanUrl },
});
