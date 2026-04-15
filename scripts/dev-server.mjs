process.env.NODE_ENV ||= "development";
process.env.PORT ||= "3000";
process.env.SERVER_HOST ||= "0.0.0.0";
process.env.JWT_SECRET ||= "dev-secret";
process.env.VITE_APP_ID ||= "local-dev";

await import("../server/_core/index.ts");
