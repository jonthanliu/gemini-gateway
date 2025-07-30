import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const requestLogs = sqliteTable(
  "RequestLog",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    apiKey: text("apiKey").notNull(),
    model: text("model").notNull(),
    statusCode: integer("statusCode").notNull(),
    isSuccess: integer("isSuccess", { mode: "boolean" }).notNull(),
    latency: real("latency").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`
    ),
  },
  (table) => {
    return {
      apiKeyIdx: index("apiKeyIdx").on(table.apiKey),
    };
  }
);

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
  disabledUntil: integer("disabledUntil", { mode: "timestamp" }),
  enabled: integer("enabled", { mode: "boolean" }).default(true).notNull(),
});

export const modelMappings = sqliteTable("model_mappings", {
  id: integer("id").primaryKey(),
  source_name: text("source_name").notNull(), // e.g., "gpt-4-*", "claude-3-opus-20240229", or "__DEFAULT__"
  source_protocol: text("source_protocol", {
    enum: ["openai", "anthropic", "gemini"],
  }).notNull(),
  priority: integer("priority").default(0).notNull(), // Higher number means higher priority for template matches

  target_name: text("target_name").notNull(), // e.g., "gemini-2.5-pro-latest"
  target_provider: text("target_provider", { enum: ["gemini"] })
    .default("gemini")
    .notNull(), // For future expansion
  target_method: text("target_method", {
    enum: ["generateContent", "streamGenerateContent"],
  })
    .default("generateContent")
    .notNull(),

  capabilities: text("capabilities", { mode: "json" }).$type<{
    vision: boolean;
    tool_calling: boolean;
    json_mode: boolean;
  }>(),
  constraints: text("constraints", { mode: "json" }).$type<{
    context_window: number;
    max_output_tokens: number;
  }>(),

  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`
  ),
});
