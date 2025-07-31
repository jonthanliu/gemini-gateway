import "@/lib/config/envConfig";
import type { Config } from "drizzle-kit";

const dialect = process.env.DB_DIALECT || "sqlite";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

let config: Config;

switch (dialect) {
  case "postgresql":
    config = {
      schema: "./lib/db/schema.ts",
      out: "./drizzle/migrations",
      dialect: "postgresql",
      dbCredentials: {
        url: process.env.DATABASE_URL,
      },
    };
    break;
  case "sqlite":
  default:
    config = {
      schema: "./lib/db/schema.ts",
      out: "./drizzle/migrations",
      dialect: "sqlite",
      dbCredentials: {
        url: process.env.DATABASE_URL,
      },
    };
    break;
}

export default config;
