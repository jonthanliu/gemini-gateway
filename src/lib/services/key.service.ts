import { getSettings } from "@/lib/config/settings";
import { db } from "@/lib/db.sqlite";
import { apiKeys, requestLogs } from "@/lib/db/schema";
import logger from "@/lib/logger";
import { and, asc, count, desc, eq, gte, lt, max, sql } from "drizzle-orm";

/**
 * Gets the next working API key using a stateless, database-driven approach.
 * Implements LRU (Least Recently Used) strategy for key selection.
 *
 * @returns A valid API key string
 * @throws Error if no valid keys are available
 */
export async function getNextWorkingKey(): Promise<string> {
  const settings = await getSettings();
  const maxFailures = settings.MAX_FAILURES;

  const selectedKey = await db.transaction(async (tx) => {
    const validKeys = await tx
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.enabled, true), lt(apiKeys.failCount, maxFailures)))
      .orderBy(asc(apiKeys.lastUsed))
      .limit(1);

    if (validKeys.length === 0) {
      // We need to throw an error that the transaction can catch and rollback.
      // A custom error type might be even better.
      throw new Error(
        "No API keys available. Please check key validity or reset failure counts."
      );
    }

    const keyToUse = validKeys[0];

    await tx
      .update(apiKeys)
      .set({ lastUsed: new Date() })
      .where(eq(apiKeys.id, keyToUse.id));

    return keyToUse;
  });

  logger.info(
    { key: `...${selectedKey.key.slice(-4)}` },
    "Selected API key using LRU strategy."
  );

  return selectedKey.key;
}

/**
 * Records a failure for an API key by incrementing its fail count.
 *
 * @param key - The API key that failed
 */
export async function handleApiFailure(key: string): Promise<void> {
  try {
    await db
      .update(apiKeys)
      .set({
        failCount: sql`${apiKeys.failCount} + 1`,
        lastChecked: new Date(),
        lastFailedAt: new Date(),
      })
      .where(eq(apiKeys.key, key));

    logger.warn(
      { key: `...${key.slice(-4)}` },
      "Failure recorded for API key."
    );
  } catch (error) {
    logger.error(
      { key: `...${key.slice(-4)}`, error },
      "Failed to record API key failure."
    );
  }
}

/**
 * Resets the failure count for an API key.
 *
 * @param key - The API key to reset
 */
export async function resetKeyFailureCount(key: string): Promise<void> {
  try {
    await db
      .update(apiKeys)
      .set({
        failCount: 0,
        lastChecked: new Date(),
      })
      .where(eq(apiKeys.key, key));

    logger.info(
      { key: `...${key.slice(-4)}` },
      "Failure count reset for API key."
    );
  } catch (error) {
    logger.error(
      { key: `...${key.slice(-4)}`, error },
      "Failed to reset API key failure count."
    );
  }
}

/**
 * Gets all API keys with their comprehensive usage statistics in a single, optimized query.
 *
 * @returns Array of key information objects, including aggregated stats.
 */
export async function getAllKeys() {
  const settings = await getSettings();
  const maxFailures = settings.MAX_FAILURES;

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
      failCount: apiKeys.failCount,
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
    isWorking: k.enabled && k.failCount < maxFailures,
    failedRequests: k.totalRequests - k.successfulRequests,
    lastUsed: k.lastUsed ? new Date(k.lastUsed) : null,
  }));
}

/**
 * Verifies an API key by making a test call to the Gemini API.
 * If successful, resets the key's failure count.
 *
 * @param key - The API key to verify
 * @returns True if the key is valid, false otherwise
 */
export async function verifyKey(key: string): Promise<boolean> {
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const settings = await getSettings();
    const healthCheckModel = settings.HEALTH_CHECK_MODEL;

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: healthCheckModel });
    await model.generateContent("hi");

    await resetKeyFailureCount(key);

    logger.info(
      { key: `...${key.slice(-4)}` },
      "Key is now active after successful health check."
    );

    return true;
  } catch (error) {
    logger.warn(
      { key: `...${key.slice(-4)}`, error },
      "Key remains inactive after failed health check."
    );
    return false;
  }
}

/**
 * Checks all inactive keys and attempts to reactivate them.
 */
export async function checkAndReactivateKeys(): Promise<void> {
  logger.info("Starting check for inactive API keys...");

  const settings = await getSettings();
  const maxFailures = settings.MAX_FAILURES;

  const inactiveKeys = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.enabled, true), gte(apiKeys.failCount, maxFailures)));

  if (inactiveKeys.length === 0) {
    logger.info("No inactive keys to check.");
    return;
  }

  logger.info(`Found ${inactiveKeys.length} inactive keys to check.`);

  for (const apiKey of inactiveKeys) {
    await verifyKey(apiKey.key);
  }
}
