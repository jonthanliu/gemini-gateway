import { db } from "@/lib/db";
import { apiKeys, requestLogs } from "@/lib/db/schema";
import logger from "@/lib/logger";
import { and, count, desc, eq, isNull, lte, max, sql, or } from "drizzle-orm";

const KEY_COOLDOWN_PERIOD_SECONDS = 5 * 60; // 5 minutes

/**
 * Gets the next available API key using a stateless, random-choice strategy.
 * This is efficient and works well for load balancing in serverless environments.
 *
 * @returns A valid API key string
 * @throws Error if no valid keys are available
 */
export async function getNextWorkingKey(): Promise<string> {
  const now = new Date();
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

  // Randomly select a key from the pool of valid keys.
  const keyToUse = validKeys[Math.floor(Math.random() * validKeys.length)];

  logger.info(
    { key: `...${keyToUse.key.slice(-4)}` },
    "Selected API key using stateless random choice strategy."
  );

  return keyToUse.key;
}

/**
 * Puts a failing API key into a timed cooldown period.
 *
 * @param key - The API key that failed
 */
export async function handleApiFailure(key: string): Promise<void> {
  const now = new Date();
  const disabledUntil = new Date(now.getTime() + KEY_COOLDOWN_PERIOD_SECONDS * 1000);

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
      { key: `...${key.slice(-4)}`, disabledUntil: disabledUntil.toISOString() },
      "Cooldown initiated for failing API key."
    );
  } catch (error) {
    logger.error(
      { key: `...${key.slice(-4)}`, error },
      "Failed to record API key failure."
    );
  }
}

/**
 * Resets the status of an API key, making it available for use again.
 *
 * @param key - The API key to reset
 */
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

/**
 * Gets all API keys with their comprehensive usage statistics in a single, optimized query.
 *
 * @returns Array of key information objects, including aggregated stats.
 */
export async function getAllKeys() {
  const now = new Date();

  // Subquery to aggregate request log data for each key
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
    isWorking: k.enabled && (!k.disabledUntil || k.disabledUntil.getTime() <= now.getTime()),
    failedRequests: k.totalRequests - k.successfulRequests,
    lastUsed: k.lastUsed ? new Date(k.lastUsed) : null,
    disabledUntil: k.disabledUntil,
  }));
}

/**
 * Checks if there is at least one API key in the database.
 * This is a highly efficient query for onboarding checks.
 *
 * @returns {Promise<boolean>} True if at least one key exists, false otherwise.
 */
export async function hasApiKeys(): Promise<boolean> {
  try {
    const result = await db.select({ count: count() }).from(apiKeys).limit(1);
    return result.length > 0 && result[0].count > 0;
  } catch (error) {
    logger.error({ error }, "Failed to check for existence of API keys.");
    // In case of a database error, we should probably assume no keys exist
    // to avoid locking users out of the onboarding process.
    return false;
  }
}
