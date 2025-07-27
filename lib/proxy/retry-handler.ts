import { getSettings } from "@/lib/config/settings";
import logger from "@/lib/logger";
import {
  getNextWorkingKey,
  handleApiFailure,
  resetKeyStatus,
} from "@/lib/services/key.service";
import { logError, logRequest } from "@/lib/services/logging.service";

type RetriableFunction<T> = (apiKey: string) => Promise<T>;

export async function retryWithExponentialBackoff<T>(
  fn: RetriableFunction<T>,
  model: string
): Promise<T> {
  const { MAX_FAILURES } = await getSettings();
  let lastError: unknown = null;

  for (let i = 0; i < MAX_FAILURES; i++) {
    const apiKey = await getNextWorkingKey();
    const startTime = Date.now();

    try {
      const result = await fn(apiKey);
      const latency = Date.now() - startTime;
      await logRequest(apiKey, model, 200, true, latency);
      await resetKeyStatus(apiKey);
      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      let statusCode = 500;
      let errorMessage = "An unknown error occurred";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      if (
        typeof error === "object" &&
        error !== null &&
        "httpStatus" in error &&
        typeof (error as { httpStatus: unknown }).httpStatus === "number"
      ) {
        statusCode = (error as { httpStatus: number }).httpStatus;
      }

      await handleApiFailure(apiKey);
      await logRequest(apiKey, model, statusCode, false, latency);
      await logError(apiKey, `SDK Error`, errorMessage, error);
      lastError = error;

      if (statusCode === 503) {
        const delay = 1000 * Math.pow(2, i) + Math.random() * 1000;
        logger.warn(
          `Service unavailable (503). Retrying in ${Math.round(delay)}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  await logError(
    "unknown",
    "General Error",
    "All API keys failed or the service is unavailable.",
    lastError
  );

  throw lastError;
}
