// app/anthropic/v1/messages/route.ts
import logger from "@/lib/logger";
import { retryWithExponentialBackoff } from "@/lib/proxy/retry-handler";
import { convertAnthropicToGemini } from "@/lib/transforms/anthropic-to-gemini";
import { streamGeminiToAnthropic } from "@/lib/transforms/gemini-to-anthropic";
import {
  GoogleGenerativeAI,
  type EnhancedGenerateContentResponse,
  type GenerateContentResult,
} from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

async function proxyAnthropicRequest(req: NextRequest) {
  const anthropicRequest = await req.json();
  const geminiRequest = convertAnthropicToGemini(anthropicRequest);

  const result = await retryWithExponentialBackoff(async (apiKey: string) => {
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
}

export async function POST(req: NextRequest) {
  try {
    return await proxyAnthropicRequest(req);
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
