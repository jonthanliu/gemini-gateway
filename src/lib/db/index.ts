import "@/lib/config/envConfig";
import { createClient, type Client } from "@libsql/client";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

declare global {
  var db: LibSQLDatabase<typeof schema> | undefined;
  var client: Client | undefined;
}

let client: Client;
if (process.env.NODE_ENV === "production") {
  client = createClient({
    url: process.env.DATABASE_URL || "file:local.db",
  });
} else {
  if (!global.client) {
    global.client = createClient({
      url: process.env.DATABASE_URL || "file:local.db",
    });
  }
  client = global.client;
}

export const db =
  global.db ||
  drizzle(client, {
    schema,
  });

if (process.env.NODE_ENV !== "production") {
  global.db = db;
}
