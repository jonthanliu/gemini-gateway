import { transformRequest } from "@/lib/adapters/anthropic-to-gemini";
import {
  streamGeminiToAnthropic,
  transformResponse,
} from "@/lib/adapters/gemini-to-anthropic";
import { geminiClient } from "@/lib/core/gemini-client";
import logger from "@/lib/logger";
import { modelMappingService } from "@/lib/services/model-mapping.service";
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
    const geminiRequest = transformRequest(geminiModelName, anthropicRequest);

    if (mapping.target_method === "streamGenerateContent") {
      logger.info(
        {
          target_model: geminiModelName,
          target_method: "streamGenerateContent",
        },
        `[Anthropic-Debug] Sending stream request to Gemini.`
      );
      const geminiStream = await geminiClient.streamGenerateContent(
        geminiModelName,
        geminiRequest
      );
      logger.info(`[Anthropic-Debug] Successfully initiated stream from Gemini.`);
      const readableStream = streamGeminiToAnthropic(geminiStream);

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
      logger.info(
        {
          target_model: geminiModelName,
          target_method: "generateContent",
        },
        `[Anthropic-Debug] Sending content request to Gemini.`
      );
      const geminiResult = await geminiClient.generateContent(
        geminiModelName,
        geminiRequest
      );
      logger.info(`[Anthropic-Debug] Successfully received response from Gemini.`);
      const anthropicResponse = transformResponse(
        geminiResult,
        geminiModelName
      );
      return NextResponse.json(anthropicResponse, { status: 200 });
    }
  } catch (error) {
    logger.error({ error }, "[Anthropic-Debug] Unhandled error");
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
