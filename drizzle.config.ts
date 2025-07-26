import type { Config } from "drizzle-kit";
import "./src/lib/config/envConfig";

const dialect = process.env.DB_DIALECT || "sqlite";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

let config: Config;

switch (dialect) {
  case "postgresql":
    config = {
      schema: "./src/lib/db/schema.ts",
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
      schema: "./src/lib/db/schema.ts",
      out: "./drizzle/migrations",
      dialect: "sqlite",
      dbCredentials: {
        url:
          process.env.NODE_ENV === "test"
            ? "file::memory:"
            : process.env.DATABASE_URL,
      },
    };
    break;
}

export default config;
