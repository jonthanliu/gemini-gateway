import {
  transformRequest,
  transformResponse,
  transformStream,
} from "@/lib/adapters/openai-to-gemini";
import { geminiClient } from "@/lib/core/gemini-client";
import logger from "@/lib/logger";
import { modelMappingService } from "@/lib/services/model-mapping.service";
import { iteratorToStream } from "@/lib/stream-utils";
import { OpenAIChatCompletionRequest } from "@/lib/types/openai-types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const openaiRequest = (await req.json()) as OpenAIChatCompletionRequest;
    const requestedOpenAIModel = openaiRequest.model;

    const mapping = await modelMappingService.findMapping(
      "openai",
      requestedOpenAIModel
    );

    if (!mapping) {
      return new NextResponse(
        JSON.stringify({
          error: `Model not supported: ${requestedOpenAIModel}`,
        }),
        { status: 404 }
      );
    }

    const geminiModelName = mapping.target_name;
    const geminiRequest = transformRequest(openaiRequest);

    if (openaiRequest.stream) {
      const geminiStream = await geminiClient.streamGenerateContent(
        geminiModelName,
        geminiRequest
      );
      const openaiStream = transformStream(geminiStream, geminiModelName);
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
      const geminiResult = await geminiClient.generateContent(
        geminiModelName,
        geminiRequest
      );
      const openaiResponse = transformResponse(geminiResult, geminiModelName);
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
