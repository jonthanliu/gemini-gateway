import { geminiClient } from "@/lib/core/gemini_client";
import logger from "@/lib/logger";
import { convertAnthropicToGemini } from "@/lib/adapters/anthropic-to-gemini";
import { streamGeminiToAnthropic } from "@/lib/adapters/gemini-to-anthropic";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const anthropicRequest = await req.json();
    const geminiRequest = convertAnthropicToGemini(anthropicRequest);

    // Anthropic bridge currently assumes a streaming response
    const geminiResponse = await geminiClient.generateContent(
      "gemini-1.5-pro",
      geminiRequest,
      true
    );

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      logger.error({ status: geminiResponse.status, errorBody }, "[Anthropic Bridge] Gemini API returned an error");
      return new NextResponse(errorBody, {
        status: geminiResponse.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!geminiResponse.body) {
      throw new Error("Stream response from Gemini is empty.");
    }

    const anthropicStream = streamGeminiToAnthropic(geminiResponse.body);

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
    logger.error(error, "[Anthropic Bridge] Unhandled error");
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
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
