import { db } from "@/lib/db";
import { settings as settingsTable } from "@/lib/db/schema";
import logger from "@/lib/logger";
import type { InferSelectModel } from "drizzle-orm";

// Cache settings to avoid frequent database calls
let settingsCache: ParsedSettings | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// 定义默认配置
export const defaultSettings = {
  MAX_FAILURES: "3",
  RETRY_DELAY_MS: "5000",
  MAX_RETRY_DURATION_MS: "30000",
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
  RETRY_DELAY_MS: number;
  MAX_RETRY_DURATION_MS: number;
  HEALTH_CHECK_MODEL: string;
  PROXY_URL: string;
  TOOLS_CODE_EXECUTION_ENABLED: boolean;
  SAFETY_SETTINGS: { category: string; threshold: string }[];
  THINKING_BUDGET_MAP: { [key: string]: number };
};

type Settings = typeof defaultSettings & {
  AUTH_TOKEN?: string;
  ALLOWED_TOKENS?: string;
};

/**
 * 获取所有配置项。
 * 从数据库加载，并处理环境变量和默认值。
 * Implements a cache to reduce database lookups.
 */
export async function getSettings(): Promise<ParsedSettings> {
  const now = Date.now();
  if (settingsCache && now - cacheTimestamp < CACHE_DURATION) {
    logger.debug("Returning cached settings");
    return settingsCache;
  }

  const parsed = await unstable_getSettings();
  settingsCache = parsed;
  cacheTimestamp = now;
  return parsed;
}

export async function unstable_getSettings(): Promise<ParsedSettings> {
  logger.debug("Fetching settings from database");
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

  for (const key of Object.keys(
    defaultSettings
  ) as (keyof typeof defaultSettings)[]) {
    const dbValue = settingsMap.get(key);
    if (dbValue !== undefined) {
      resolvedSettings[key] = dbValue;
    } else {
      const envValue = process.env[key];
      if (envValue !== undefined) {
        resolvedSettings[key] = envValue;
      }
    }
  }

  // Handle settings not in defaultSettings
  resolvedSettings.AUTH_TOKEN =
    settingsMap.get("AUTH_TOKEN") || process.env.AUTH_TOKEN || "";
  resolvedSettings.ALLOWED_TOKENS =
    settingsMap.get("ALLOWED_TOKENS") || process.env.ALLOWED_TOKENS || "";

  return parseSettings(resolvedSettings);
}

function parseSettings(settings: Settings): ParsedSettings {
  const maxFailures = parseInt(settings.MAX_FAILURES, 10);
  if (isNaN(maxFailures)) {
    logger.warn(
      `Invalid MAX_FAILURES value: "${settings.MAX_FAILURES}". Defaulting to 3.`
    );
    settings.MAX_FAILURES = "3";
  }

  const retryDelayMs = parseInt(settings.RETRY_DELAY_MS, 10);
  if (isNaN(retryDelayMs)) {
    logger.warn(
      `Invalid RETRY_DELAY_MS value: "${settings.RETRY_DELAY_MS}". Defaulting to 5000.`
    );
    settings.RETRY_DELAY_MS = "5000";
  }

  const maxRetryDurationMs = parseInt(settings.MAX_RETRY_DURATION_MS, 10);
  if (isNaN(maxRetryDurationMs)) {
    logger.warn(
      `Invalid MAX_RETRY_DURATION_MS value: "${settings.MAX_RETRY_DURATION_MS}". Defaulting to 30000.`
    );
    settings.MAX_RETRY_DURATION_MS = "30000";
  }

  return {
    AUTH_TOKEN: settings.AUTH_TOKEN || "",
    ALLOWED_TOKENS: settings.ALLOWED_TOKENS || "",
    MAX_FAILURES: parseInt(settings.MAX_FAILURES, 10),
    RETRY_DELAY_MS: parseInt(settings.RETRY_DELAY_MS, 10),
    MAX_RETRY_DURATION_MS: parseInt(settings.MAX_RETRY_DURATION_MS, 10),
    HEALTH_CHECK_MODEL: settings.HEALTH_CHECK_MODEL,
    PROXY_URL: settings.PROXY_URL,
    TOOLS_CODE_EXECUTION_ENABLED:
      settings.TOOLS_CODE_EXECUTION_ENABLED === "true",
    SAFETY_SETTINGS: JSON.parse(settings.SAFETY_SETTINGS),
    THINKING_BUDGET_MAP: JSON.parse(settings.THINKING_BUDGET_MAP),
  };
}

/**
 * 清空配置缓存。
 */
export function resetSettings(): void {
  logger.info("Settings cache cleared");
  settingsCache = null;
  cacheTimestamp = 0;
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
  resetSettings();
}
