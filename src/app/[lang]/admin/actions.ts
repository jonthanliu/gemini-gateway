"use server";

import { db } from "#db";
import { hashToken } from "@/lib/crypto";
import {
  apiKeys,
  errorLogs,
  requestLogs,
  settings as settingsTable,
} from "@/lib/db/schema";
import { getDictionary } from "@/lib/get-dictionary";
import { getLocale } from "@/lib/get-locale";
import { resetKeyManager } from "@/lib/key-manager";
import { resetKeyFailureCount, verifyKey } from "@/lib/services/key.service";
import {
  ParsedSettings,
  resetSettings,
  updateSetting as updateSettingInDb,
} from "@/lib/settings";
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  type InferSelectModel,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";

type Stats = {
  total: { total: number; failed: number };
  "1m": { total: number; failed: number };
  "1h": { total: number; failed: number };
  "24h": { total: number; failed: number };
};

export async function addApiKeys(keysString: string) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.keys.addDialog;

  if (!keysString) {
    return { error: t.error.noKeys };
  }

  const allSubmittedKeys = keysString
    .split(/[\n,]+/)
    .map((key) => key.trim())
    .filter(Boolean);

  if (allSubmittedKeys.length === 0) {
    return { error: t.error.noKeysInInput };
  }

  const uniqueSubmittedKeys = [...new Set(allSubmittedKeys)];

  try {
    type ApiKeySelect = InferSelectModel<typeof apiKeys>;
    const existingKeysResult = await db
      .select({ key: apiKeys.key })
      .from(apiKeys)
      .where(inArray(apiKeys.key, uniqueSubmittedKeys));
    const existingKeySet = new Set(
      existingKeysResult.map((k: Pick<ApiKeySelect, "key">) => k.key)
    );

    const newKeysToAdd = uniqueSubmittedKeys.filter(
      (key) => !existingKeySet.has(key)
    );

    let message = "";

    if (newKeysToAdd.length > 0) {
      await db.insert(apiKeys).values(newKeysToAdd.map((key) => ({ key })));
      message += t.success.added.replace(
        "{count}",
        newKeysToAdd.length.toString()
      );
      resetKeyManager();
      revalidatePath("/admin");
    } else {
      message += t.info.noNewKeys;
    }

    const duplicateCount = uniqueSubmittedKeys.length - newKeysToAdd.length;
    if (duplicateCount > 0) {
      message +=
        " " + t.info.duplicates.replace("{count}", duplicateCount.toString());
    }

    return { success: message.trim() };
  } catch (_error) {
    console.error("Failed to add API keys:", _error);
    return { error: t.error.failedToAdd };
  }
}

export async function deleteApiKeys(keys: string[]) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.keys.table;

  if (!keys || keys.length === 0) {
    return { error: t.error.noKeysForDeletion };
  }
  try {
    const deleteResponse = await db
      .delete(apiKeys)
      .where(inArray(apiKeys.key, keys))
      .returning();
    resetKeyManager();
    revalidatePath("/admin");
    return {
      success: t.success.deleted.replace(
        "{count}",
        deleteResponse.length.toString()
      ),
    };
  } catch {
    return { error: t.error.failedToDelete };
  }
}

export async function resetKeysFailures(keys: string[]) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.keys.table;

  if (!keys || keys.length === 0) {
    return { error: t.error.noKeysForReset };
  }
  try {
    await Promise.all(keys.map((key) => resetKeyFailureCount(key)));
    revalidatePath("/admin");
    return {
      success: t.success.reset.replace("{count}", keys.length.toString()),
    };
  } catch {
    return { error: t.error.failedToReset };
  }
}

export async function verifyApiKeys(keys: string[]) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.keys.table;

  if (!keys || keys.length === 0) {
    return { error: t.error.noKeysForVerification };
  }
  try {
    const results = await Promise.all(
      keys.map(async (key) => {
        const success = await verifyKey(key);
        return { key, success };
      })
    );
    revalidatePath("/admin");
    return { success: t.success.verificationCompleted, results };
  } catch {
    return { error: t.error.failedToVerify };
  }
}

export async function getKeyUsageDetails(apiKey: string) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.keys.table.usage;

  try {
    const where = eq(requestLogs.apiKey, apiKey);

    const totalCallsResult = await db
      .select({ count: count() })
      .from(requestLogs)
      .where(where);
    const successfulCallsResult = await db
      .select({ count: count() })
      .from(requestLogs)
      .where(and(where, eq(requestLogs.isSuccess, true)));

    const totalCalls = totalCallsResult[0].count;
    const successfulCalls = successfulCallsResult[0].count;
    const failedCalls = totalCalls - successfulCalls;

    const recentLogs = await db
      .select()
      .from(requestLogs)
      .where(where)
      .orderBy(desc(requestLogs.createdAt))
      .limit(50);

    return {
      stats: {
        total: totalCalls,
        success: successfulCalls,
        failed: failedCalls,
      },
      logs: recentLogs,
      error: null,
    };
  } catch (error) {
    console.error(`Failed to fetch key usage details for ${apiKey}:`, error);
    return {
      stats: { total: 0, success: 0, failed: 0 },
      logs: [],
      error: t.error,
    };
  }
}

export async function updateSetting(key: string, value: string) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.config.form;

  try {
    await updateSettingInDb(key, value);
    resetSettings();
    revalidatePath("/admin");
    return { success: t.success.updated };
  } catch (error) {
    console.error(`Failed to update setting ${key}:`, error);
    return { error: t.error.failedToUpdate };
  }
}

export async function updateSettings(settings: ParsedSettings) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.config.form;

  try {
    const settingsToUpdate: Omit<ParsedSettings, "AUTH_TOKEN"> & {
      AUTH_TOKEN?: string;
    } = { ...settings };

    if (settings.AUTH_TOKEN) {
      const hashedToken = await hashToken(settings.AUTH_TOKEN);
      settingsToUpdate.AUTH_TOKEN = hashedToken;
    } else {
      delete settingsToUpdate.AUTH_TOKEN;
    }

    const updates = Object.entries(settingsToUpdate).map(([key, value]) => {
      let dbValue: string;
      if (typeof value === "boolean") {
        dbValue = value.toString();
      } else if (typeof value === "number") {
        dbValue = value.toString();
      } else if (typeof value === "object") {
        dbValue = JSON.stringify(value);
      } else {
        dbValue = value as string;
      }
      return db
        .insert(settingsTable)
        .values({ key, value: dbValue })
        .onConflictDoUpdate({
          target: settingsTable.key,
          set: { value: dbValue },
        });
    });

    await Promise.all(updates);

    resetSettings();
    resetKeyManager();
    revalidatePath("/admin/config");
    revalidatePath("/admin");

    return { success: t.success.updated };
  } catch (error) {
    console.error("Failed to update settings:", error);
    return { error: t.error.failedToUpdate };
  }
}

export async function getKeyStats() {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.dashboard;

  try {
    const totalKeysResult = await db.select({ count: count() }).from(apiKeys);
    const enabledKeysResult = await db
      .select({ count: count() })
      .from(apiKeys)
      .where(eq(apiKeys.enabled, true));

    const totalKeys = totalKeysResult[0].count;
    const enabledKeys = enabledKeysResult[0].count;
    const invalidKeys = totalKeys - enabledKeys;

    return {
      total: totalKeys,
      enabled: enabledKeys,
      invalid: invalidKeys,
      error: null,
    };
  } catch (error) {
    console.error("Failed to fetch key stats:", error);
    return {
      total: 0,
      enabled: 0,
      invalid: 0,
      error: t.error.failedToFetchKeyStats,
    };
  }
}

export async function getApiCallStats() {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.dashboard;

  try {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

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
      lastMinute: callsLastMinuteResult[0].count,
      lastHour: callsLastHourResult[0].count,
      last24Hours: callsLast24HoursResult[0].count,
      error: null,
    };
  } catch (error) {
    console.error("Failed to fetch API call stats:", error);
    return {
      lastMinute: 0,
      lastHour: 0,
      last24Hours: 0,
      error: t.error.failedToFetchApiCallStats,
    };
  }
}

export async function getDetailedKeyStats() {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.dashboard;

  try {
    const allKeys = await db
      .select({
        key: apiKeys.key,
        enabled: apiKeys.enabled,
        failCount: apiKeys.failCount,
        createdAt: apiKeys.createdAt,
        lastUsed: apiKeys.lastUsed,
      })
      .from(apiKeys)
      .orderBy(desc(apiKeys.createdAt));

    return { allKeys, error: null };
  } catch (error) {
    console.error("Failed to fetch detailed key stats:", error);
    return {
      allKeys: [],
      error: t.error.failedToFetchDetailedKeyStats,
    };
  }
}

type TimeFrame = "1m" | "1h" | "24h";

export async function getDetailedApiCallStats(timeframe: TimeFrame) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.dashboard;

  try {
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

    const where = gte(requestLogs.createdAt, gteDate);
    const recentLogs = await db
      .select()
      .from(requestLogs)
      .where(where)
      .orderBy(desc(requestLogs.createdAt))
      .limit(100);

    const totalResult = await db
      .select({ count: count() })
      .from(requestLogs)
      .where(where);
    const successResult = await db
      .select({ count: count() })
      .from(requestLogs)
      .where(and(where, eq(requestLogs.isSuccess, true)));

    const total = totalResult[0].count;
    const success = successResult[0].count;
    const failed = total - success;

    return { logs: recentLogs, stats: { total, success, failed }, error: null };
  } catch (error) {
    console.error(
      `Failed to fetch detailed API call stats for ${timeframe}:`,
      error
    );
    return {
      logs: [],
      stats: { total: 0, success: 0, failed: 0 },
      error: t.error.failedToFetchDetailedApiCallStats,
    };
  }
}

type LogType = "request" | "error";

interface LogFilters {
  logType: LogType;
  page?: number;
  limit?: number;
  apiKey?: string;
  errorType?: string;
  errorCode?: string;
  startDate?: string;
  endDate?: string;
}

export async function getLogs(filters: LogFilters) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.logs;

  const {
    logType,
    page = 1,
    limit = 15,
    apiKey,
    errorType,
    errorCode,
    startDate,
    endDate,
  } = filters;

  try {
    if (logType === "request") {
      const conditions = [];
      if (apiKey) conditions.push(eq(requestLogs.apiKey, apiKey));
      if (errorCode)
        conditions.push(eq(requestLogs.statusCode, parseInt(errorCode, 10)));
      if (startDate)
        conditions.push(gte(requestLogs.createdAt, new Date(startDate)));
      if (endDate)
        conditions.push(lte(requestLogs.createdAt, new Date(endDate)));

      const where = and(...conditions);
      const totalResult = await db
        .select({ count: count() })
        .from(requestLogs)
        .where(where);
      const logs = await db
        .select()
        .from(requestLogs)
        .where(where)
        .orderBy(desc(requestLogs.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      return { logs, total: totalResult[0].count, error: null };
    } else {
      const conditions = [];
      if (apiKey) conditions.push(eq(errorLogs.apiKey, apiKey));
      if (errorType) conditions.push(eq(errorLogs.errorType, errorType));
      if (errorCode)
        conditions.push(eq(errorLogs.errorMessage, `status_code=${errorCode}`));
      if (startDate)
        conditions.push(gte(errorLogs.createdAt, new Date(startDate)));
      if (endDate) conditions.push(lte(errorLogs.createdAt, new Date(endDate)));

      const where = and(...conditions);
      const totalResult = await db
        .select({ count: count() })
        .from(errorLogs)
        .where(where);
      const logs = await db
        .select()
        .from(errorLogs)
        .where(where)
        .orderBy(desc(errorLogs.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      return { logs, total: totalResult[0].count, error: null };
    }
  } catch (_error) {
    const errorMessage = t.error.failedToFetch.replace("{logType}", logType);
    console.error(errorMessage, _error);
    return { logs: [], total: 0, error: errorMessage };
  }
}

export async function deleteLogs(logIds: number[], logType: LogType) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.logs;

  try {
    let response;
    if (logType === "request") {
      response = await db
        .delete(requestLogs)
        .where(inArray(requestLogs.id, logIds))
        .returning();
    } else {
      response = await db
        .delete(errorLogs)
        .where(inArray(errorLogs.id, logIds))
        .returning();
    }
    revalidatePath("/admin");
    return {
      success: t.success.deleted.replace("{count}", response.length.toString()),
    };
  } catch (_error) {
    console.error(`Failed to delete ${logType} logs:`, _error);
    return { error: t.error.failedToDelete.replace("{logType}", logType) };
  }
}

export async function clearAllLogs(logType: LogType) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.logs;

  try {
    if (logType === "request") {
      await db.delete(requestLogs);
    } else {
      await db.delete(errorLogs);
    }
    revalidatePath("/admin");
    return { success: t.success.cleared.replace("{logType}", logType) };
  } catch (_error) {
    console.error(`Failed to clear ${logType} logs:`, _error);
    return { error: t.error.failedToClear.replace("{logType}", logType) };
  }
}

async function getStats(apiKey?: string): Promise<Stats> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const baseConditions = apiKey ? [eq(requestLogs.apiKey, apiKey)] : [];

  try {
    const totalResult = await db
      .select({ count: count() })
      .from(requestLogs)
      .where(and(...baseConditions));
    const totalFailedResult = await db
      .select({ count: count() })
      .from(requestLogs)
      .where(and(...baseConditions, eq(requestLogs.isSuccess, false)));

    const lastMinuteResult = await db
      .select({ count: count() })
      .from(requestLogs)
      .where(and(...baseConditions, gte(requestLogs.createdAt, oneMinuteAgo)));
    const lastMinuteFailedResult = await db
      .select({ count: count() })
      .from(requestLogs)
      .where(
        and(
          ...baseConditions,
          gte(requestLogs.createdAt, oneMinuteAgo),
          eq(requestLogs.isSuccess, false)
        )
      );

    const lastHourResult = await db
      .select({ count: count() })
      .from(requestLogs)
      .where(and(...baseConditions, gte(requestLogs.createdAt, oneHourAgo)));
    const lastHourFailedResult = await db
      .select({ count: count() })
      .from(requestLogs)
      .where(
        and(
          ...baseConditions,
          gte(requestLogs.createdAt, oneHourAgo),
          eq(requestLogs.isSuccess, false)
        )
      );

    const last24HoursResult = await db
      .select({ count: count() })
      .from(requestLogs)
      .where(
        and(...baseConditions, gte(requestLogs.createdAt, twentyFourHoursAgo))
      );
    const last24HoursFailedResult = await db
      .select({ count: count() })
      .from(requestLogs)
      .where(
        and(
          ...baseConditions,
          gte(requestLogs.createdAt, twentyFourHoursAgo),
          eq(requestLogs.isSuccess, false)
        )
      );

    return {
      total: {
        total: totalResult[0].count,
        failed: totalFailedResult[0].count,
      },
      "1m": {
        total: lastMinuteResult[0].count,
        failed: lastMinuteFailedResult[0].count,
      },
      "1h": {
        total: lastHourResult[0].count,
        failed: lastHourFailedResult[0].count,
      },
      "24h": {
        total: last24HoursResult[0].count,
        failed: last24HoursFailedResult[0].count,
      },
    };
  } catch (error) {
    console.error(
      `Failed to fetch stats${apiKey ? ` for key ${apiKey}` : ""}:`,
      error
    );
    const emptyStats = {
      total: { total: 0, failed: 0 },
      "1m": { total: 0, failed: 0 },
      "1h": { total: 0, failed: 0 },
      "24h": { total: 0, failed: 0 },
    };
    return emptyStats;
  }
}

export async function getSystemStats() {
  return getStats();
}

export async function getApiKeyStats(apiKey: string) {
  return getStats(apiKey);
}
