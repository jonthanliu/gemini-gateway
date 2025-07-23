import { db } from "@/lib/db.sqlite";
import type { InferSelectModel } from "drizzle-orm";
import { settings as settingsTable } from "./db/schema";
import logger from "./logger";

// 定义默认配置
const defaultSettings = {
  AUTH_TOKEN: "", // Add AUTH_TOKEN to the defaults
  ALLOWED_TOKENS: "",
  MAX_FAILURES: "3",
  HEALTH_CHECK_MODEL: "gemini-1.5-flash",
  PROXY_URL: "", // Optional proxy URL
  // Booleans are stored as strings "true" or "false"
  TOOLS_CODE_EXECUTION_ENABLED: "false",
  // JSON objects are stored as strings
  SAFETY_SETTINGS: JSON.stringify([
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  ]),
  THINKING_BUDGET_MAP: JSON.stringify({}),
};

// Define a more specific type for settings to help with parsing
export type ParsedSettings = {
  AUTH_TOKEN: string;
  ALLOWED_TOKENS: string;
  MAX_FAILURES: number;
  HEALTH_CHECK_MODEL: string;
  PROXY_URL: string;
  TOOLS_CODE_EXECUTION_ENABLED: boolean;
  SAFETY_SETTINGS: { category: string; threshold: string }[];
  THINKING_BUDGET_MAP: { [key: string]: number };
};

type Settings = typeof defaultSettings;
/**
 * 获取所有配置项。
 * 从数据库加载，并处理环境变量和默认值。
 * Note: Caching was removed to prevent stale data issues in serverless environments.
 */
export async function getSettings(): Promise<ParsedSettings> {
  let settingsMap = new Map<string, string>();
  type SettingSelect = InferSelectModel<typeof settingsTable>;
  try {
    const settingsFromDb = await db.select().from(settingsTable);
    settingsMap = new Map(
      settingsFromDb.map((s: SettingSelect) => [s.key, s.value])
    );
  } catch (error) {
    // This can happen on the first run if the database is not yet migrated.
    // We can safely ignore it and proceed with defaults.
    logger.warn(
      "Could not fetch settings from database, proceeding with defaults. This is expected on first run.",
      error
    );
  }

  const resolvedSettings: Settings = { ...defaultSettings };

  for (const key of Object.keys(defaultSettings) as (keyof Settings)[]) {
    let value = settingsMap.get(key);

    if (value === undefined) {
      const envValue = process.env[key];
      if (envValue !== undefined) {
        value = envValue;
      } else {
        value = defaultSettings[key];
      }
    }
    resolvedSettings[key] = value;
  }

  return parseSettings(resolvedSettings);
}

function parseSettings(settings: Settings): ParsedSettings {
  return {
    AUTH_TOKEN: settings.AUTH_TOKEN,
    ALLOWED_TOKENS: settings.ALLOWED_TOKENS,
    MAX_FAILURES: parseInt(settings.MAX_FAILURES, 10),
    HEALTH_CHECK_MODEL: settings.HEALTH_CHECK_MODEL,
    PROXY_URL: settings.PROXY_URL,
    TOOLS_CODE_EXECUTION_ENABLED:
      settings.TOOLS_CODE_EXECUTION_ENABLED === "true",
    SAFETY_SETTINGS: JSON.parse(settings.SAFETY_SETTINGS),
    THINKING_BUDGET_MAP: JSON.parse(settings.THINKING_BUDGET_MAP),
  };
}

/**
 * 清空配置缓存（已废弃，因为缓存已被移除）。
 */
export function resetSettings(): void {
  // No-op, cache was removed.
}

/**
 * 更新单个配置项。
 * @param key - 配置项的键
 * @param value - 配置项的值
 */
export async function updateSetting(key: string, value: string) {
  await db.insert(settingsTable).values({ key, value }).onConflictDoUpdate({
    target: settingsTable.key,
    set: { value },
  });
  // No need to call resetSettings() as the cache has been removed.
}
