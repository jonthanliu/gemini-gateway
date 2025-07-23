import type { Config } from "drizzle-kit";
import "./src/lib/envConfig";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./prisma/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "local.db",
  },
} satisfies Config;
