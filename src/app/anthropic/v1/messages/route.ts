// app/anthropic/v1/messages/route.ts
import logger from "@/lib/logger";
import {
  getNextWorkingKey,
  handleApiFailure,
  resetKeyFailureCount,
} from "@/lib/services/key.service";
import { logError, logRequest } from "@/lib/services/logging.service";
import { convertAnthropicToGemini } from "@/lib/transforms/anthropic-to-gemini";
import { streamGeminiToAnthropic } from "@/lib/transforms/gemini-to-anthropic";
import {
  GoogleGenerativeAI,
  type EnhancedGenerateContentResponse,
  type GenerateContentResult,
} from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

type ErrorWithStatus = {
  status?: number;
  error?: {
    status?: number;
  };
};

function isApiError(error: unknown): error is { httpStatus?: number } {
  return typeof error === "object" && error !== null && "httpStatus" in error;
}

async function retryWithBackoff<T>(
  fn: (apiKey: string) => Promise<T>,
  model: string,
  retries = 5,
  delay = 1000,
  backoffFactor = 2
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < retries; i++) {
    const apiKey = await getNextWorkingKey();
    const startTime = Date.now();
    try {
      const result = await fn(apiKey);
      const latency = Date.now() - startTime;
      await logRequest(apiKey, model, 200, true, latency);
      await resetKeyFailureCount(apiKey);
      return result;
    } catch (error: unknown) {
      lastError = error;
      const latency = Date.now() - startTime;
      let statusCode = 500;
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";

      const isServiceUnavailable =
        (error instanceof Error && error.message.includes("503")) ||
        (error as ErrorWithStatus)?.status === 503 ||
        (error as ErrorWithStatus)?.error?.status === 503;

      if (isApiError(error) && error.httpStatus) {
        statusCode = error.httpStatus;
      }

      await handleApiFailure(apiKey);
      await logRequest(apiKey, model, statusCode, false, latency);
      await logError(apiKey, "Anthropic Bridge Error", errorMessage, error);

      if (isServiceUnavailable) {
        if (i < retries - 1) {
          const backoffDelay =
            delay * Math.pow(backoffFactor, i) + Math.random() * 1000; // Add jitter
          logger.warn(
            `[Anthropic Bridge] Service Unavailable (503). Retrying in ${Math.round(
              backoffDelay
            )}ms... (Attempt ${i + 1}/${retries})`
          );
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        } else {
          throw lastError;
        }
      } else {
        // Not a retriable error
        throw error;
      }
    }
  }

  logger.error(
    {
      error: lastError,
      errorMessage:
        lastError instanceof Error
          ? lastError.message
          : "An unknown error occurred",
    },
    "[Anthropic Bridge] Max retries reached. Giving up."
  );
  throw lastError;
}

export async function POST(req: NextRequest) {
  try {
    const anthropicRequest = await req.json();
    const geminiRequest = convertAnthropicToGemini(anthropicRequest);

    const result = await retryWithBackoff(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-pro",
      });
      return model.generateContentStream(geminiRequest);
    }, "gemini-2.5-pro");

    // Adapt the stream to match the expected type
    async function* adaptStream(
      sourceStream: AsyncGenerator<EnhancedGenerateContentResponse>
    ): AsyncIterable<GenerateContentResult> {
      for await (const chunk of sourceStream) {
        yield { response: chunk };
      }
    }

    const adaptedStream = adaptStream(result.stream);
    const anthropicStream = streamGeminiToAnthropic(adaptedStream);

    return new NextResponse(anthropicStream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "anthropic-version": "2023-06-01",
        "anthropic-request-id": `req_${Date.now()}`,
      },
    });
  } catch (error) {
    logger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : "N/A",
        errorStack: error instanceof Error ? error.stack : "N/A",
        errorConstructor: error?.constructor?.name,
        errorString: String(error),
      },
      "[Anthropic Bridge Error]"
    );
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      {
        type: "error",
        error: {
          type: "internal_server_error",
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
