import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const nodeEnv = process.env.NODE_ENV;

const envSpecificFiles =
  nodeEnv === "homologation"
    ? [".env.homolog", ".env.homolog.local"]
    : nodeEnv === "production"
      ? [".env.production", ".env.production.local"]
      : [".env.development.local"];

const envFiles = [
  ...envSpecificFiles,
  ".env.local",
  ".env",
];

for (const fileName of envFiles) {
  const envPath = path.join(projectRoot, fileName);
  if (!fs.existsSync(envPath)) continue;

  dotenv.config({
    path: envPath,
    override: false,
  });
}
