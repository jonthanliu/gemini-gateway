import { db } from "@/lib/db.sqlite";
import { apiKeys } from "@/lib/db/schema";
import logger from "@/lib/logger";
import { getSettings } from "@/lib/settings";
import type { InferSelectModel } from "drizzle-orm";
import { and, asc, eq, gte, lt } from "drizzle-orm";

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

  const validKeys = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.enabled, true), lt(apiKeys.failCount, maxFailures)))
    .orderBy(asc(apiKeys.lastUsed))
    .limit(1);

  if (validKeys.length === 0) {
    throw new Error(
      "No API keys available. Please check key validity or reset failure counts."
    );
  }

  const selectedKey = validKeys[0];

  await db
    .update(apiKeys)
    .set({ lastUsed: new Date() })
    .where(eq(apiKeys.id, selectedKey.id));

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
    const currentKeyResult = await db
      .select({ failCount: apiKeys.failCount })
      .from(apiKeys)
      .where(eq(apiKeys.key, key));

    if (currentKeyResult.length > 0) {
      const currentKey = currentKeyResult[0];
      await db
        .update(apiKeys)
        .set({
          failCount: currentKey.failCount + 1,
          lastChecked: new Date(),
          lastFailedAt: new Date(),
        })
        .where(eq(apiKeys.key, key));
    }

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
 * Gets all API keys with their status information.
 *
 * @returns Array of key information objects
 */
export async function getAllKeys(): Promise<
  {
    key: string;
    failCount: number;
    isWorking: boolean;
    lastUsed: Date | null;
    lastChecked: Date | null;
    lastFailedAt: Date | null;
  }[]
> {
  const settings = await getSettings();
  const maxFailures = settings.MAX_FAILURES;

  const keys = await db.select().from(apiKeys).orderBy(asc(apiKeys.createdAt));

  type ApiKeySelect = InferSelectModel<typeof apiKeys>;

  return keys.map((apiKey: ApiKeySelect) => ({
    key: apiKey.key,
    failCount: apiKey.failCount,
    isWorking: apiKey.enabled && apiKey.failCount < maxFailures,
    lastUsed: apiKey.lastUsed,
    lastChecked: apiKey.lastChecked,
    lastFailedAt: apiKey.lastFailedAt,
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
