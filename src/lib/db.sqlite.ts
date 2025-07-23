import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./db/schema";
import "./envConfig";

const sqlite = new Database(process.env.DATABASE_URL || "local.db");
export const db = drizzle(sqlite, { schema });
