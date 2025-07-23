import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const requestLogs = sqliteTable("RequestLog", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  apiKey: text("apiKey").notNull(),
  model: text("model").notNull(),
  statusCode: integer("statusCode").notNull(),
  isSuccess: integer("isSuccess", { mode: "boolean" }).notNull(),
  latency: real("latency").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`
  ),
});

export const errorLogs = sqliteTable("ErrorLog", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  apiKey: text("apiKey"),
  errorType: text("errorType").notNull(),
  errorMessage: text("errorMessage").notNull(),
  errorDetails: text("errorDetails"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`
  ),
});

export const settings = sqliteTable("Setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const apiKeys = sqliteTable("ApiKey", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`
  ),
  lastUsed: integer("lastUsed", { mode: "timestamp" }),
  lastChecked: integer("lastChecked", { mode: "timestamp" }),
  lastFailedAt: integer("lastFailedAt", { mode: "timestamp" }),
  failCount: integer("failCount").default(0).notNull(),
  enabled: integer("enabled", { mode: "boolean" }).default(true).notNull(),
});
