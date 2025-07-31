"use server";

import { db } from "@/lib/db";
import { requestLogs } from "@/lib/db/schema";
import { and, avg, count, eq, gte, lte, sql } from "drizzle-orm";

export interface StatsFilters {
  startDate?: string;
  endDate?: string;
}

export async function getApiCallStats(filters: StatsFilters) {
  const { startDate, endDate } = filters;

  const conditions = [];
  if (startDate)
    conditions.push(gte(requestLogs.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(requestLogs.createdAt, new Date(endDate)));

  const where = and(...conditions);

  const totalResult = await db
    .select({ totalRequests: count() })
    .from(requestLogs)
    .where(where);

  const successResult = await db
    .select({ successfulRequests: count() })
    .from(requestLogs)
    .where(and(where, eq(requestLogs.isSuccess, true)));

  const latencyResult = await db
    .select({ averageLatency: avg(requestLogs.latency) })
    .from(requestLogs)
    .where(where);

  const totalRequests = totalResult[0]?.totalRequests ?? 0;
  const successfulRequests = successResult[0]?.successfulRequests ?? 0;
  const successRate =
    totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
  const averageLatency = parseFloat(latencyResult[0]?.averageLatency || "0");

  return {
    totalRequests,
    successfulRequests,
    successRate,
    averageLatency,
  };
}

export async function getStatsByModel(filters: StatsFilters) {
  const { startDate, endDate } = filters;

  const conditions = [];
  if (startDate)
    conditions.push(gte(requestLogs.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(requestLogs.createdAt, new Date(endDate)));

  const where = and(...conditions);

  const result = await db
    .select({
      model: requestLogs.model,
      totalRequests: count(),
      successfulRequests: count(and(eq(requestLogs.isSuccess, true))),
      averageLatency: avg(requestLogs.latency),
    })
    .from(requestLogs)
    .where(where)
    .groupBy(requestLogs.model);

  return result.map((row) => ({
    ...row,
    successRate:
      row.totalRequests > 0
        ? (row.successfulRequests / row.totalRequests) * 100
        : 0,
    averageLatency: parseFloat(row.averageLatency || "0"),
  }));
}

export async function getStatsByApiKey(filters: StatsFilters) {
  const { startDate, endDate } = filters;

  const conditions = [];
  if (startDate)
    conditions.push(gte(requestLogs.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(requestLogs.createdAt, new Date(endDate)));

  const where = and(...conditions);

  const result = await db
    .select({
      apiKey: requestLogs.apiKey,
      totalRequests: count(),
      successfulRequests: count(and(eq(requestLogs.isSuccess, true))),
      averageLatency: avg(requestLogs.latency),
    })
    .from(requestLogs)
    .where(where)
    .groupBy(requestLogs.apiKey);

  return result.map((row) => ({
    ...row,
    successRate:
      row.totalRequests > 0
        ? (row.successfulRequests / row.totalRequests) * 100
        : 0,
    averageLatency: parseFloat(row.averageLatency || "0"),
  }));
}

export async function getDailyStats(filters: StatsFilters) {
  const { startDate, endDate } = filters;

  const conditions = [];
  if (startDate)
    conditions.push(gte(requestLogs.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(requestLogs.createdAt, new Date(endDate)));

  const where = and(...conditions);

  // Group by date, not by timestamp
  const dateColumn = sql<string>`strftime('%Y-%m-%d', ${requestLogs.createdAt})`;

  const result = await db
    .select({
      date: dateColumn,
      totalRequests: count(),
      successfulRequests: count(and(eq(requestLogs.isSuccess, true))),
    })
    .from(requestLogs)
    .where(where)
    .groupBy(dateColumn);

  return result
    .filter((row) => row.date) // Filter out null dates
    .map((row) => ({
      date: row.date!, // Non-null assertion as we've filtered
      totalRequests: row.totalRequests,
      successfulRequests: row.successfulRequests,
    }));
}
