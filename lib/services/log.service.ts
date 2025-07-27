
"use server";

import { db } from "@/lib/db";
import { errorLogs, requestLogs } from "@/lib/db/schema";
import { and, count, desc, eq, gte, inArray, lte } from "drizzle-orm";

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

    return { logs, total: totalResult[0].count };
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

    return { logs, total: totalResult[0].count };
  }
}

export type Logs = Awaited<ReturnType<typeof getLogs>>;
export type Log = Logs["logs"][number];

export async function deleteLogs(logIds: number[], logType: LogType) {
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
  return response;
}

export async function clearAllLogs(logType: LogType) {
  if (logType === "request") {
    await db.delete(requestLogs);
  } else {
    await db.delete(errorLogs);
  }
}
