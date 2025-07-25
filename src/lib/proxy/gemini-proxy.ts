import { getSettings } from "@/lib/config/settings";
import {
  buildGeminiRequest,
  formatGoogleModelsToOpenAI,
} from "@/lib/google/google-adapter";
import logger from "@/lib/logger";
import {
  getNextWorkingKey,
  handleApiFailure,
  resetKeyFailureCount,
} from "@/lib/services/key.service";
import { logError, logRequest } from "@/lib/services/logging.service";
import { Agent } from "http";
import { HttpsProxyAgent } from "https-proxy-agent";
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_HOST =
  process.env.GOOGLE_API_HOST || "https://generativelanguage.googleapis.com";

interface FetchOptions extends RequestInit {
  agent?: Agent;
  duplex?: "half";
}

/**
 * Extracts and prepares headers for forwarding, removing host-specific headers.
 */
export function getRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  return headers;
}

/**
 * Safely gets the request body as a ReadableStream or null.
 */
export async function getRequestBody(
  request: NextRequest
): Promise<ReadableStream<Uint8Array> | null> {
  if (request.body) {
    return request.body;
  }
  return null;
}

/**
 * Creates a new ReadableStream from an existing one to ensure it can be read.
 */
export function createReadableStream(
  body: ReadableStream<Uint8Array>
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(value);
    },
    cancel() {
      reader.cancel();
    },
  });
}

export async function proxyRequest(request: NextRequest, pathPrefix: string) {
  const startTime = Date.now();
  const timings = {
    total: 0,
    getKey: 0,
    getSettings: 0,
    buildRequest: 0,
    fetch: 0,
    dbLogging: 0,
    dbUpdate: 0,
  };
  let apiKey = "unknown";
  let model = "unknown";
  let statusCode: number | null = null;
  let isSuccess = false;

  try {
    let t = Date.now();
    apiKey = await getNextWorkingKey();
    timings.getKey = Date.now() - t;

    // Reconstruct the original Gemini API URL
    const url = new URL(request.url);
    const modelPath = url.pathname.replace(pathPrefix, "");
    model = modelPath.split("/").pop()?.split(":")[0] ?? ""; // Assign to the outer model variable
    const geminiUrl = `${GOOGLE_API_HOST}${modelPath}${
      url.search ? url.search + "&" : "?"
    }key=${apiKey}`;

    let geminiRequestBody: unknown;
    const t_build = Date.now();
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      const requestBody = await request.json();
      geminiRequestBody = await buildGeminiRequest(model, requestBody);
    }
    timings.buildRequest = Date.now() - t_build;

    const t_settings = Date.now();
    const settings = await getSettings();
    timings.getSettings = Date.now() - t_settings;

    const fetchOptions: FetchOptions = {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: geminiRequestBody ? JSON.stringify(geminiRequestBody) : null,
      duplex: "half",
    };

    if (settings.PROXY_URL) {
      fetchOptions.agent = new HttpsProxyAgent(settings.PROXY_URL);
    }

    let geminiResponse: Response | null = null;
    let lastError: Error | null = null;
    const maxRetries = settings.MAX_FAILURES;
    const retryDelay = 500;

    t = Date.now();
    for (let i = 0; i < maxRetries; i++) {
      try {
        geminiResponse = await fetch(geminiUrl, fetchOptions);
        // We only retry on specific network errors, so if we get a response,
        // we exit the loop regardless of the status code.
        break;
      } catch (error: unknown) {
        lastError = error as Error;
        if (
          error instanceof TypeError &&
          error.message.includes("fetch failed")
        ) {
          logger.warn(
            `Fetch failed, retrying... (${i + 1}/${maxRetries})`,
            error
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }
        throw error; // Rethrow non-retryable errors
      }
    }
    timings.fetch = Date.now() - t;

    if (!geminiResponse) {
      throw (
        lastError ||
        new Error("Failed to fetch from Gemini after multiple retries")
      );
    }

    // If the response is streaming, we pipe it through.
    if (
      geminiResponse.headers.get("Content-Type")?.includes("text/event-stream")
    ) {
      isSuccess = geminiResponse.ok;
      statusCode = geminiResponse.status;
      return new NextResponse(geminiResponse.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        status: geminiResponse.status,
      });
    }

    // Otherwise, we return the JSON response directly.
    // Check if the response from Gemini is not OK
    if (!geminiResponse.ok) {
      statusCode = geminiResponse.status;
      const errorText = await geminiResponse.text();
      let errorBody: unknown = {};
      let errorMessage = "Unknown error";

      if (errorText) {
        try {
          errorBody = JSON.parse(errorText);
          errorMessage =
            (errorBody as { error?: { message?: string } })?.error?.message ||
            "Unknown error";
        } catch {
          errorMessage = "Failed to parse error response from Gemini";
          errorBody = { error: { message: errorText } };
        }
      } else {
        errorMessage = `Received empty error response from Gemini with status ${geminiResponse.status}`;
        errorBody = { error: { message: errorMessage } };
      }

      logError(apiKey, "gemini_api_error", errorMessage, errorBody);

      logger.error(
        {
          status: geminiResponse.status,
          statusText: geminiResponse.statusText,
          errorBody,
        },
        "Error response from Google Gemini API"
      );
      return NextResponse.json(errorBody as { error?: { message?: string } }, {
        status: geminiResponse.status,
      });
    }

    // Success
    isSuccess = true;
    statusCode = geminiResponse.status;

    // Otherwise, we return the JSON response directly.
    const data = await geminiResponse.json();

    // If the request is for OpenAI models, format the response.
    if (url.pathname.startsWith("/openai/v1/models")) {
      const formattedData = formatGoogleModelsToOpenAI(data);
      return NextResponse.json(formattedData, {
        status: geminiResponse.status,
      });
    }

    return NextResponse.json(data, { status: geminiResponse.status });
  } catch (error) {
    statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("No API keys available") ||
      errorMessage.includes("KeyManager must be initialized")
    ) {
      logger.warn(
        { error: errorMessage },
        "KeyManager initialization failed. No keys were loaded from DB or ENV."
      );
      return NextResponse.json(
        {
          error: {
            message: "Forbidden: No API tokens configured",
            code: 403,
            status: "Forbidden",
          },
        },
        { status: 403 }
      );
    }

    if (errorMessage.includes("All API keys are currently failing")) {
      logger.error(
        { error: errorMessage },
        "All available API keys are marked as failing."
      );
      return NextResponse.json(
        {
          error: {
            message: "Forbidden: All API keys are failing",
            code: 403,
            status: "Forbidden",
          },
        },
        { status: 403 }
      );
    }

    logger.error(error, "Error proxying to Gemini");
    return NextResponse.json(
      { error: "Failed to proxy request to Gemini" },
      { status: 500 }
    );
  } finally {
    if (statusCode) {
      const latency = Date.now() - startTime;
      timings.total = latency;

      // Asynchronously log the request without awaiting
      (async () => {
        const t = Date.now();
        try {
          if (isSuccess) {
            await resetKeyFailureCount(apiKey);
          } else {
            await handleApiFailure(apiKey);
          }
          timings.dbUpdate = Date.now() - t;

          await logRequest(apiKey, model, statusCode, isSuccess, latency);
          timings.dbLogging = Date.now() - t;
          logger.info({ timings }, "Request performance metrics");
        } catch (error) {
          logger.error(error, "Failed to write request log to database");
        }
      })();
    }
  }
}
