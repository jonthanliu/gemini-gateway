import "@/lib/config/envConfig";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./db/schema";

const client = createClient({
  url: process.env.DATABASE_URL || "file:local.db",
});

// Set WAL mode and a busy timeout to handle concurrent writes.
client.execute("PRAGMA journal_mode = WAL;");
client.execute("PRAGMA busy_timeout = 5000;");

export const db = drizzle(client, { schema });
