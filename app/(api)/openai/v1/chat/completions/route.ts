import {
  transformOpenAIRequestToGemini,
} from "@/lib/adapters/openai-to-gemini";
import {
  streamGeminiToOpenAI,
  transformGeminiResponseToOpenAI,
} from "@/lib/adapters/gemini-to-openai";
import { geminiClient } from "@/lib/core/gemini-client";
import logger from "@/lib/logger";
import { iteratorToStream, streamToAsyncIterable } from "@/lib/stream-utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const openaiRequest = await req.json();

    const modelMap: Record<string, string> = {
      "gpt-3.5-turbo": "gemini-1.5-flash",
      "gpt-4": "gemini-1.5-pro",
      "gpt-4-turbo": "gemini-1.5-pro",
      "gpt-4o": "gemini-1.5-pro",
    };
    const requestedOpenAIModel = openaiRequest.model || "gpt-3.5-turbo";
    const geminiModelName =
      modelMap[requestedOpenAIModel] || "gemini-1.5-flash";

    const geminiRequest = transformOpenAIRequestToGemini(openaiRequest);

    const geminiResponse = await geminiClient.generateContent(
      geminiModelName,
      geminiRequest,
      openaiRequest.stream
    );

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      logger.error(
        { status: geminiResponse.status, errorBody },
        "[OpenAI Bridge] Gemini API returned an error"
      );
      return new NextResponse(errorBody, {
        status: geminiResponse.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (openaiRequest.stream) {
      if (!geminiResponse.body) {
        throw new Error("Stream response from Gemini is empty.");
      }
      const adaptedStream = streamToAsyncIterable(geminiResponse.body);
      const openaiStream = await streamGeminiToOpenAI(
        adaptedStream,
        geminiModelName
      );
      const readableStream = iteratorToStream(openaiStream);

      return new NextResponse(readableStream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      const geminiJson = await geminiResponse.json();
      const openaiResponse = transformGeminiResponseToOpenAI(
        geminiJson,
        geminiModelName
      );
      return NextResponse.json(openaiResponse, { status: 200 });
    }
  } catch (error) {
    logger.error(error, "[OpenAI Bridge] Unhandled error");
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      {
        error: {
          message: errorMessage,
          type: "internal_server_error",
        },
      },
      { status: 500 }
    );
  }
}
