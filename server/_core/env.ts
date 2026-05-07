import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const envSchema = z.object({
  VITE_APP_ID: z.string().optional().default(""),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  DATABASE_URL: z.string().url().optional().or(z.literal("")),
  OAUTH_SERVER_URL: z.string().url().optional().or(z.literal("")),
  OWNER_OPEN_ID: z.string().optional().default(""),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  BUILT_IN_FORGE_API_URL: z.string().optional().default(""),
  BUILT_IN_FORGE_API_KEY: z.string().optional().default(""),
  CORS_ORIGINS: z.string().optional().default(""),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),
});

const isTest = process.env.NODE_ENV === "test";

if (isTest && !process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-secret-test-secret-test-secret-32+chars";
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const flat = parsed.error.flatten().fieldErrors;
  console.error("[ENV] Invalid environment configuration:", flat);
  if (!isTest) {
    throw new Error(
      "Invalid environment. Set required variables in .env: " +
        Object.keys(flat).join(", ")
    );
  }
}

const data = parsed.success
  ? parsed.data
  : (envSchema.parse({
      ...process.env,
      JWT_SECRET: "test-secret-test-secret-test-secret-32+chars",
    }) as z.infer<typeof envSchema>);

export const ENV = {
  appId: data.VITE_APP_ID,
  cookieSecret: data.JWT_SECRET,
  jwtSecret: data.JWT_SECRET,
  databaseUrl: data.DATABASE_URL ?? "",
  oAuthServerUrl: data.OAUTH_SERVER_URL ?? "",
  ownerOpenId: data.OWNER_OPEN_ID,
  isProduction: data.NODE_ENV === "production",
  isTest: data.NODE_ENV === "test",
  forgeApiUrl: data.BUILT_IN_FORGE_API_URL,
  forgeApiKey: data.BUILT_IN_FORGE_API_KEY,
  corsOrigins: data.CORS_ORIGINS
    ? data.CORS_ORIGINS.split(",").map(o => o.trim()).filter(Boolean)
    : [],
  rateLimitWindowMs: data.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: data.RATE_LIMIT_MAX,
  authRateLimitMax: data.AUTH_RATE_LIMIT_MAX,
};
