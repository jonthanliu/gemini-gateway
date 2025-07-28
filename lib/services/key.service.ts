import { db } from "@/lib/db";
import { apiKeys, requestLogs } from "@/lib/db/schema";
import logger from "@/lib/logger";
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  max,
  or,
  sql,
} from "drizzle-orm";

const KEY_COOLDOWN_PERIOD_SECONDS = 60; // 1 minute
const GLOBAL_CIRCUIT_BREAKER_PERIOD_SECONDS = 60; // 1 minute

let circuitBreakerTrippedUntil: Date | null = null;

export class CircuitBreakerError extends Error {
  public readonly trippedUntil: Date;
  constructor(message: string, trippedUntil: Date) {
    super(message);
    this.name = "CircuitBreakerError";
    this.trippedUntil = trippedUntil;
  }
}

export function tripCircuitBreaker() {
  if (!circuitBreakerTrippedUntil || new Date() > circuitBreakerTrippedUntil) {
    const now = new Date();
    circuitBreakerTrippedUntil = new Date(
      now.getTime() + GLOBAL_CIRCUIT_BREAKER_PERIOD_SECONDS * 1000
    );
    logger.error(
      { trippedUntil: circuitBreakerTrippedUntil.toISOString() },
      "GLOBAL CIRCUIT BREAKER TRIPPED."
    );
  }
}

export async function getNextWorkingKey(): Promise<string> {
  const now = new Date();
  if (circuitBreakerTrippedUntil && now < circuitBreakerTrippedUntil) {
    throw new CircuitBreakerError(
      `Circuit breaker is tripped. No requests will be made until ${circuitBreakerTrippedUntil.toISOString()}.`,
      circuitBreakerTrippedUntil
    );
  }
  circuitBreakerTrippedUntil = null; // Reset if time has passed
  const validKeys = await db
    .select({ key: apiKeys.key })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.enabled, true),
        or(isNull(apiKeys.disabledUntil), lte(apiKeys.disabledUntil, now))
      )
    );

  if (validKeys.length === 0) {
    throw new Error(
      "No API keys available. All keys are currently in cooldown."
    );
  }

  const keyToUse = validKeys[Math.floor(Math.random() * validKeys.length)];
  logger.info(
    { key: `...${keyToUse.key.slice(-4)}` },
    "Selected API key using stateless random choice strategy."
  );
  return keyToUse.key;
}

export async function handleApiFailure(
  key: string,
  cooldownSeconds?: number
): Promise<void> {
  const now = new Date();
  const cooldown =
    cooldownSeconds !== undefined
      ? cooldownSeconds
      : KEY_COOLDOWN_PERIOD_SECONDS;
  const disabledUntil = new Date(now.getTime() + cooldown * 1000);

  try {
    await db
      .update(apiKeys)
      .set({
        disabledUntil: disabledUntil,
        lastChecked: now,
        lastFailedAt: now,
      })
      .where(eq(apiKeys.key, key));
    logger.warn(
      {
        key: `...${key.slice(-4)}`,
        disabledUntil: disabledUntil.toISOString(),
        cooldownSeconds: cooldown,
      },
      "Cooldown initiated for failing API key."
    );
  } catch (error) {
    logger.error(
      { key: `...${key.slice(-4)}`, error },
      "Failed to record API key failure."
    );
  }
}

export async function resetKeyStatus(key: string): Promise<void> {
  try {
    await db
      .update(apiKeys)
      .set({
        disabledUntil: null,
        lastChecked: new Date(),
      })
      .where(eq(apiKeys.key, key));
    logger.info(
      { key: `...${key.slice(-4)}` },
      "Key status reset. Key is now active."
    );
  } catch (error) {
    logger.error(
      { key: `...${key.slice(-4)}`, error },
      "Failed to reset API key status."
    );
  }
}

export async function getAllKeys() {
  const now = new Date();
  const keyStatsSubQuery = db
    .select({
      apiKey: requestLogs.apiKey,
      totalRequests: count(requestLogs.id).as("totalRequests"),
      successfulRequests:
        sql<number>`SUM(CASE WHEN ${requestLogs.isSuccess} = 1 THEN 1 ELSE 0 END)`.as(
          "successfulRequests"
        ),
      lastUsedInLog: max(requestLogs.createdAt).as("lastUsedInLog"),
    })
    .from(requestLogs)
    .groupBy(requestLogs.apiKey)
    .as("keyStats");
  const keysWithStats = await db
    .select({
      id: apiKeys.id,
      key: apiKeys.key,
      createdAt: apiKeys.createdAt,
      lastChecked: apiKeys.lastChecked,
      lastFailedAt: apiKeys.lastFailedAt,
      disabledUntil: apiKeys.disabledUntil,
      enabled: apiKeys.enabled,
      totalRequests: sql<number>`COALESCE(${keyStatsSubQuery.totalRequests}, 0)`,
      successfulRequests: sql<number>`COALESCE(${keyStatsSubQuery.successfulRequests}, 0)`,
      lastUsed: sql<Date>`COALESCE(${keyStatsSubQuery.lastUsedInLog}, ${apiKeys.lastUsed})`,
    })
    .from(apiKeys)
    .leftJoin(keyStatsSubQuery, eq(apiKeys.key, keyStatsSubQuery.apiKey))
    .orderBy(desc(apiKeys.createdAt));
  return keysWithStats.map((k) => ({
    ...k,
    isWorking:
      k.enabled &&
      (!k.disabledUntil || k.disabledUntil.getTime() <= now.getTime()),
    failedRequests: k.totalRequests - k.successfulRequests,
    lastUsed: k.lastUsed ? new Date(k.lastUsed) : null,
    disabledUntil: k.disabledUntil,
  }));
}
export type GetAllKeysReturnType = Awaited<ReturnType<typeof getAllKeys>>;

export async function hasApiKeys(): Promise<boolean> {
  try {
    const result = await db.select({ count: count() }).from(apiKeys).limit(1);
    return result.length > 0 && result[0].count > 0;
  } catch (error) {
    logger.error({ error }, "Failed to check for existence of API keys.");
    return false;
  }
}

export async function addApiKeys(
  keys: string[]
): Promise<{ added: number; duplicates: number }> {
  if (!keys || keys.length === 0) {
    return { added: 0, duplicates: 0 };
  }
  const uniqueKeys = [...new Set(keys)].filter(Boolean);
  if (uniqueKeys.length === 0) {
    return { added: 0, duplicates: 0 };
  }
  try {
    const existingKeysResult = await db
      .select({ key: apiKeys.key })
      .from(apiKeys)
      .where(inArray(apiKeys.key, uniqueKeys));
    const existingKeySet = new Set(existingKeysResult.map((k) => k.key));
    const newKeysToAdd = uniqueKeys.filter((key) => !existingKeySet.has(key));
    const duplicates = uniqueKeys.length - newKeysToAdd.length;
    if (newKeysToAdd.length > 0) {
      const newKeyRecords = newKeysToAdd.map((key) => ({
        key,
        enabled: true,
      }));
      await db.insert(apiKeys).values(newKeyRecords);
      logger.info(
        { count: newKeysToAdd.length },
        "Successfully added new API keys."
      );
    }
    if (duplicates > 0) {
      logger.info(
        { count: duplicates },
        "Skipped duplicate API keys during insertion."
      );
    }
    return { added: newKeysToAdd.length, duplicates };
  } catch (error) {
    logger.error({ error }, "Failed to add new API keys during DB operation.");
    throw new Error("An unexpected database error occurred while adding keys.");
  }
}

export async function deleteApiKeys(keys: string[]) {
  if (!keys || keys.length === 0) {
    throw new Error("No keys provided for deletion.");
  }
  const deleteResponse = await db
    .delete(apiKeys)
    .where(inArray(apiKeys.key, keys))
    .returning();
  logger.info(
    { count: deleteResponse.length },
    "Successfully deleted API keys."
  );
  return deleteResponse;
}

export async function getKeyUsageDetails(apiKey: string) {
  const where = eq(requestLogs.apiKey, apiKey);
  const statsResult = await db
    .select({
      total: count(),
      success: count(
        sql<number>`CASE WHEN ${requestLogs.isSuccess} = 1 THEN 1 END`
      ),
    })
    .from(requestLogs)
    .where(where);
  const { total, success } = statsResult[0] || { total: 0, success: 0 };
  const failed = total - success;
  const recentLogs = await db
    .select({
      id: requestLogs.id,
      model: requestLogs.model,
      statusCode: requestLogs.statusCode,
      isSuccess: requestLogs.isSuccess,
      createdAt: requestLogs.createdAt,
    })
    .from(requestLogs)
    .where(where)
    .orderBy(desc(requestLogs.createdAt))
    .limit(50);
  return {
    stats: { total, success, failed },
    logs: recentLogs,
  };
}

export async function getSystemApiCallStats() {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  try {
    const callsLastMinuteResult = await db
      .select({ count: count() })
      .from(requestLogs)
      .where(gte(requestLogs.createdAt, oneMinuteAgo));
    const callsLastHourResult = await db
      .select({ count: count() })
      .from(requestLogs)
      .where(gte(requestLogs.createdAt, oneHourAgo));
    const callsLast24HoursResult = await db
      .select({ count: count() })
      .from(requestLogs)
      .where(gte(requestLogs.createdAt, twentyFourHoursAgo));
    return {
      "1m": { total: callsLastMinuteResult[0]?.count ?? 0 },
      "1h": { total: callsLastHourResult[0]?.count ?? 0 },
      "24h": { total: callsLast24HoursResult[0]?.count ?? 0 },
    };
  } catch (error) {
    logger.error({ error }, "Failed to fetch system API call stats.");
    return { "1m": { total: 0 }, "1h": { total: 0 }, "24h": { total: 0 } };
  }
}

export async function getDetailedKeyStats() {
  try {
    const allKeys = await db
      .select({
        key: apiKeys.key,
        enabled: apiKeys.enabled,
        createdAt: apiKeys.createdAt,
        lastUsed: apiKeys.lastUsed,
      })
      .from(apiKeys)
      .orderBy(desc(apiKeys.createdAt));
    return allKeys;
  } catch (error) {
    logger.error({ error }, "Failed to fetch detailed key stats.");
    throw new Error("Failed to fetch detailed key stats.");
  }
}

type TimeFrame = "1m" | "1h" | "24h";

export async function getDetailedApiCallStats(timeframe: TimeFrame) {
  const now = new Date();
  let gteDate: Date;
  switch (timeframe) {
    case "1m":
      gteDate = new Date(now.getTime() - 1 * 60 * 1000);
      break;
    case "1h":
      gteDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case "24h":
      gteDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
  }
  try {
    const where = gte(requestLogs.createdAt, gteDate);
    const recentLogs = await db
      .select()
      .from(requestLogs)
      .where(where)
      .orderBy(desc(requestLogs.createdAt))
      .limit(100);
    const statsResult = await db
      .select({
        total: count(),
        success: count(
          sql<number>`CASE WHEN ${requestLogs.isSuccess} = 1 THEN 1 END`
        ),
      })
      .from(requestLogs)
      .where(where);
    const { total, success } = statsResult[0] || { total: 0, success: 0 };
    const failed = total - success;
    return { logs: recentLogs, stats: { total, success, failed } };
  } catch (error) {
    logger.error(
      { error, timeframe },
      `Failed to fetch detailed API call stats for ${timeframe}.`
    );
    throw new Error(
      `Failed to fetch detailed API call stats for ${timeframe}.`
    );
  }
}

export async function checkAndResetKeyStatus(): Promise<void> {
  const now = new Date();
  const keysInCooldown = await db
    .select({ key: apiKeys.key })
    .from(apiKeys)
    .where(and(eq(apiKeys.enabled, true), lte(apiKeys.disabledUntil, now)));

  if (keysInCooldown.length === 0) {
    return;
  }

  logger.info(
    { count: keysInCooldown.length },
    "Found keys in cooldown. Performing health checks."
  );

  const GOOGLE_API_HOST =
    process.env.GOOGLE_API_HOST || "https://generativelanguage.googleapis.com";
  const healthCheckUrl = `${GOOGLE_API_HOST}/v1beta/models`;

  for (const { key } of keysInCooldown) {
    try {
      const response = await fetch(`${healthCheckUrl}?key=${key}`);
      if (response.ok) {
        await resetKeyStatus(key);
      }
    } catch (error) {
      logger.warn(
        { key: `...${key.slice(-4)}`, error },
        "Health check failed for key."
      );
    }
  }
}
