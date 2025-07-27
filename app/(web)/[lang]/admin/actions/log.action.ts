
"use server";

import { revalidatePath } from "next/cache";
import {
  clearAllLogs,
  deleteLogs,
  getLogs,
  Log,
  LogFilters,
} from "@/lib/services/log.service";

type LogType = "request" | "error";

export async function getLogsAction(filters: LogFilters): Promise<{
  data?: { logs: Log[]; total: number };
  error?: string;
}> {
  try {
    const data = await getLogs(filters);
    return { data };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return { error: `Failed to fetch logs: ${errorMessage}` };
  }
}

export async function deleteLogsAction(logIds: number[], logType: LogType) {
  try {
    const deleted = await deleteLogs(logIds, logType);
    revalidatePath("/admin/logs");
    return { success: `Deleted ${deleted.length} log(s).` };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return { error: `Failed to delete logs: ${errorMessage}` };
  }
}

export async function clearAllLogsAction(logType: LogType) {
  try {
    await clearAllLogs(logType);
    revalidatePath("/admin/logs");
    return { success: `Successfully cleared all ${logType} logs.` };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return { error: `Failed to clear logs: ${errorMessage}` };
  }
}
