import {
  transformRequest,
  transformResponse,
  transformStream,
} from "@/lib/adapters/anthropic-to-gemini";
import { geminiClient } from "@/lib/core/gemini-client";
import logger from "@/lib/logger";
import { modelMappingService } from "@/lib/services/model-mapping.service";
import { iteratorToStream } from "@/lib/stream-utils";
import * as Anthropic from "@anthropic-ai/sdk/resources/messages";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const anthropicRequest =
      (await req.json()) as Anthropic.MessageCreateParams;
    const requestedAnthropicModel = anthropicRequest.model;

    const mapping = await modelMappingService.findMapping(
      "anthropic",
      requestedAnthropicModel
    );

    if (!mapping) {
      return NextResponse.json(
        {
          type: "error",
          error: {
            type: "not_found_error",
            message: `Model not supported: ${requestedAnthropicModel}`,
          },
        },
        { status: 404 }
      );
    }

    const geminiModelName = mapping.target_name;
    const geminiRequest = transformRequest(anthropicRequest);

    if (mapping.target_method === "streamGenerateContent") {
      const geminiStream = await geminiClient.streamGenerateContent(
        geminiModelName,
        geminiRequest
      );
      const anthropicStream = transformStream(geminiStream);
      const readableStream = iteratorToStream(anthropicStream);

      return new NextResponse(readableStream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "anthropic-version": "2023-06-01",
        },
      });
    } else {
      const geminiResult = await geminiClient.generateContent(
        geminiModelName,
        geminiRequest
      );
      const anthropicResponse = transformResponse(
        geminiResult,
        geminiModelName
      );
      return NextResponse.json(anthropicResponse, { status: 200 });
    }
  } catch (error) {
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
