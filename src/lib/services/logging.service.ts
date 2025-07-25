import { db } from "@/lib/db.sqlite";
import { errorLogs, requestLogs } from "@/lib/db/schema";
import logger from "@/lib/logger";

export async function logRequest(
  apiKey: string,
  model: string,
  statusCode: number,
  isSuccess: boolean,
  latency: number
) {
  try {
    await db.insert(requestLogs).values({
      apiKey,
      model,
      statusCode,
      isSuccess,
      latency,
    });
  } catch (error) {
    logger.error(error, "Failed to write request log to database");
  }
}

export async function logError(
  apiKey: string,
  errorType: string,
  errorMessage: string,
  errorDetails: unknown
) {
  try {
    await db.insert(errorLogs).values({
      apiKey,
      errorType,
      errorMessage,
      errorDetails: JSON.stringify(errorDetails),
    });
  } catch (error) {
    logger.error(error, "Failed to write error log to database");
  }
}
