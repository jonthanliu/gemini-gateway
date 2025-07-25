import "@/lib/config/envConfig";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./db/schema";

const client = createClient({
  url: process.env.DATABASE_URL || "file:local.db",
});

export const db = drizzle(client, { schema });
