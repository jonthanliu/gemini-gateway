import "@/lib/config/envConfig";
import { createClient, type Client } from "@libsql/client";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

declare global {
  var db: LibSQLDatabase<typeof schema> | undefined;
  var client: Client | undefined;
}

if (!global.client) {
  global.client = createClient({
    url: process.env.DATABASE_URL || "file:local.db",
  });

  global.client.execute("PRAGMA journal_mode = WAL;");
  global.client.execute("PRAGMA busy_timeout = 5000;");
}
const client: Client = global.client;

if (!global.db) {
  global.db = drizzle(client, {
    schema,
  });
}

export const db = global.db;
