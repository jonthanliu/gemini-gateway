// app/anthropic/v1/messages/route.ts
import logger from "@/lib/logger";
import { getNextWorkingKey } from "@/lib/services/key.service";
import { convertAnthropicToGemini } from "@/lib/transforms/anthropic-to-gemini";
import { streamGeminiToAnthropic } from "@/lib/transforms/gemini-to-anthropic";
import {
  GoogleGenerativeAI,
  type EnhancedGenerateContentResponse,
  type GenerateContentResult,
} from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const anthropicRequest = await req.json();
    const geminiRequest = convertAnthropicToGemini(anthropicRequest);
    const apiKey = await getNextWorkingKey();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: anthropicRequest.model || "gemini-pro",
    });

    const result = await model.generateContentStream(geminiRequest);

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
    logger.error({ error }, "[Anthropic Bridge Error]");
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
