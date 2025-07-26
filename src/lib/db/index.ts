import "@/lib/config/envConfig";
import { createClient, type Client } from "@libsql/client";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

declare global {
  var db: LibSQLDatabase<typeof schema> | undefined;
  var client: Client | undefined;
}

if (!global.client) {
  const isTest = process.env.NODE_ENV === "test";
  global.client = createClient({
    url: isTest
      ? "file::memory:?cache=shared"
      : process.env.DATABASE_URL || "file:local.db",
  });

  // For production/development, enable WAL mode for better concurrency.
  if (!isTest) {
    global.client.execute("PRAGMA journal_mode = WAL;");
    global.client.execute("PRAGMA busy_timeout = 5000;");
  }
}
const client: Client = global.client;

if (!global.db) {
  global.db = drizzle(client, {
    schema,
  });
}

export const db = global.db;
