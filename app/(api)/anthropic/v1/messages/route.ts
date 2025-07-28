import { convertAnthropicToGemini } from "@/lib/adapters/anthropic-to-gemini";
import { streamGeminiToAnthropic } from "@/lib/adapters/gemini-to-anthropic";
import { geminiClient } from "@/lib/core/gemini-client";
import logger from "@/lib/logger";
import { CircuitBreakerError } from "@/lib/services/key.service";
import { streamToAsyncIterable } from "@/lib/stream-utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const anthropicRequest = await req.json();
    // logger.info({ anthropicRequest }, "[Anthropic Bridge] Received request.");
    const geminiRequest = convertAnthropicToGemini(anthropicRequest);

    // Anthropic bridge currently assumes a streaming response
    const geminiResponse = await geminiClient.generateContent(
      "gemini-2.5-pro",
      geminiRequest,
      true
    );

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      logger.error(
        { status: geminiResponse.status, errorBody },
        "[Anthropic Bridge] Gemini API returned an error"
      );
      return new NextResponse(errorBody, {
        status: geminiResponse.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!geminiResponse.body) {
      throw new Error("Stream response from Gemini is empty.");
    }

    const adaptedStream = streamToAsyncIterable(geminiResponse.body);
    const anthropicStream = streamGeminiToAnthropic(adaptedStream);

    return new NextResponse(anthropicStream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "anthropic-version": "2023-06-01",
      },
    });
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      const retryAfter = Math.ceil(
        (error.trippedUntil.getTime() - Date.now()) / 1000
      );
      return NextResponse.json(
        {
          type: "error",
          error: {
            type: "service_unavailable",
            message: `The service is temporarily unavailable. Please try again in ${retryAfter} seconds.`,
          },
        },
        {
          status: 503,
          headers: {
            "Retry-After": `${retryAfter}`,
          },
        }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    logger.error({ error: errorMessage }, "[Anthropic Bridge] Unhandled error");
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
