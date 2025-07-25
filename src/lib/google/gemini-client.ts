import { getSettings } from "@/lib/config/settings";
import {
  getNextWorkingKey,
  handleApiFailure,
  resetKeyFailureCount,
} from "@/lib/services/key.service";
import { logError, logRequest } from "@/lib/services/logging.service";
import {
  EnhancedGenerateContentResponse,
  GenerateContentRequest,
  GoogleGenerativeAI,
} from "@google/generative-ai";
import { NextResponse } from "next/server";

export interface GeminiClientRequest {
  model: string;
  request: GenerateContentRequest;
}

/**
 * Transforms a stream from the @google/generative-ai SDK into a web-standard ReadableStream.
 */
function sdkStreamToReadableStream(
  sdkStream: AsyncGenerator<EnhancedGenerateContentResponse>
): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of sdkStream) {
        // The SDK provides response chunks directly. We adapt them to SSE format.
        const jsonChunk = JSON.stringify(chunk);
        controller.enqueue(encoder.encode(`data: ${jsonChunk}\n\n`));
      }
      controller.close();
    },
  });
}

/**
 * Checks if the given error is an object with an httpStatus property.
 */
function isApiError(error: unknown): error is { httpStatus?: number } {
  return typeof error === "object" && error !== null && "httpStatus" in error;
}

/**
 * Calls the Gemini API using the official SDK with built-in retry logic,
 * key management, and logging.
 *
 * @returns A Response object with the Gemini API's stream or an error.
 */
export async function callGeminiApi({
  model,
  request,
}: GeminiClientRequest): Promise<Response> {
  const { MAX_FAILURES } = await getSettings();
  let lastError: unknown = null;

  for (let i = 0; i < MAX_FAILURES; i++) {
    const apiKey = await getNextWorkingKey();
    const startTime = Date.now();

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const generativeModel = genAI.getGenerativeModel({ model });

      const result = await generativeModel.generateContentStream(request);
      const stream = sdkStreamToReadableStream(result.stream);

      // On success, log and return immediately.
      const latency = Date.now() - startTime;
      await logRequest(apiKey, model, 200, true, latency);
      await resetKeyFailureCount(apiKey);

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (error) {
      const latency = Date.now() - startTime;
      let statusCode = 500;
      let errorMessage = "An unknown error occurred";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      if (isApiError(error) && error.httpStatus) {
        statusCode = error.httpStatus;
      }

      // Log the failure and continue to the next key.
      await handleApiFailure(apiKey);
      await logRequest(apiKey, model, statusCode, false, latency);
      await logError(apiKey, `SDK Error`, errorMessage, error);
      lastError = error;
    }
  }

  // If all keys fail, log a general error and return a 503.
  await logError(
    "unknown",
    "General Error",
    "All API keys failed or the service is unavailable.",
    lastError
  );

  return NextResponse.json(
    {
      error: "Service unavailable",
      details: lastError
        ? lastError instanceof Error
          ? lastError.message
          : JSON.stringify(lastError)
        : "Unknown error",
    },
    { status: 503 }
  );
}
