import logger from "@/lib/logger";
import * as Anthropic from "@anthropic-ai/sdk/resources/messages";
import type { GenerateContentResponse, Part } from "@google/genai";

/**
 * Transforms a Gemini API response to an Anthropic-compatible format.
 * @param geminiResponse The response from the Gemini API.
 * @param model The model name used for the request.
 * @returns An Anthropic Message object.
 */
export function transformResponse(
  geminiResponse: GenerateContentResponse,
  model: string
): Anthropic.Messages.Message {
  const messageId = `msg_${Date.now().toString(36)}`;
  const candidate = geminiResponse.candidates?.[0];

  if (!candidate) {
    throw new Error("No candidates found in Gemini response");
  }

  const content: Anthropic.ContentBlock[] =
    candidate.content?.parts
      ?.map((part: Part): Anthropic.ContentBlock | null => {
        if (part.text) {
          return { type: "text", text: part.text, citations: [] };
        }
        if (part.functionCall) {
          return {
            type: "tool_use",
            id: part.functionCall.name || "",
            name: part.functionCall.name || "",
            input: part.functionCall.args || {},
          };
        }
        return null;
      })
      .filter((c): c is Anthropic.ContentBlock => c !== null) || [];

  const stopReason =
    (candidate.finishReason as string) === "TOOL_CALL"
      ? "tool_use"
      : "end_turn";

  const res = {
    id: messageId,
    type: "message",
    role: "assistant",
    content: content,
    model: model,
    stop_reason: stopReason as Anthropic.Messages.Message["stop_reason"],
    stop_sequence: null,
    usage: {
      input_tokens: geminiResponse.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: geminiResponse.usageMetadata?.candidatesTokenCount ?? 0,
    } as Anthropic.Messages.Message["usage"],
  } as Anthropic.Messages.Message;

  return res;
}

/**
 * Converts a Gemini API stream to an Anthropic-compatible SSE stream.
 * @param geminiStream The async iterable stream from the Gemini API.
 * @returns A ReadableStream in the Anthropic SSE format.
 */
export function streamGeminiToAnthropic(
  geminiStream: AsyncIterable<GenerateContentResponse>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const messageId = `msg_${Date.now().toString(36)}`;
  let blockIndex = 0;

  const writeEvent = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    eventType: string,
    data: unknown
  ) => {
    controller.enqueue(
      encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`)
    );
  };

  return new ReadableStream({
    async start(controller) {
      // 1. Send message_start
      writeEvent(controller, "message_start", {
        type: "message_start",
        message: {
          id: messageId,
          type: "message",
          role: "assistant",
          content: [],
          model: "gemini-pro-equivalent", // Or dynamically set
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 }, // Placeholder
        },
      });

      let totalOutputTokens = 0;
      let finalStopReason = null;

      let chunk: GenerateContentResponse | undefined;
      try {
        for await (chunk of geminiStream) {
          const candidate = chunk.candidates?.[0];
          if (!candidate) continue;

          const chunkOutputTokens =
            chunk.usageMetadata?.candidatesTokenCount || 0;
          totalOutputTokens += chunkOutputTokens;

          if (chunkOutputTokens > 0) {
            writeEvent(controller, "message_delta", {
              type: "message_delta",
              delta: {},
              usage: {
                output_tokens: totalOutputTokens,
              },
            });
          }

          // Safely access and iterate over parts, as a chunk may have no content
          // or be stopped for safety reasons.
          const parts = candidate.content?.parts;
          if (parts && parts.length > 0) {
            for (const part of parts) {
              if (part.text) {
                // 2. Handle text block
                writeEvent(controller, "content_block_start", {
                  type: "content_block_start",
                  index: blockIndex,
                  content_block: { type: "text", text: "" },
                });
                writeEvent(controller, "content_block_delta", {
                  type: "content_block_delta",
                  index: blockIndex,
                  delta: { type: "text_delta", text: part.text },
                });
                writeEvent(controller, "content_block_stop", {
                  type: "content_block_stop",
                  index: blockIndex,
                });
                blockIndex++;
              } else if (part.functionCall) {
                // 3. Handle tool use block
                writeEvent(controller, "content_block_start", {
                  type: "content_block_start",
                  index: blockIndex,
                  content_block: {
                    type: "tool_use",
                    id: part.functionCall.name,
                    name: part.functionCall.name,
                    input: {},
                  },
                });
                writeEvent(controller, "content_block_delta", {
                  type: "content_block_delta",
                  index: blockIndex,
                  delta: {
                    type: "input_json_delta",
                    partial_json: JSON.stringify(part.functionCall.args),
                  },
                });
                writeEvent(controller, "content_block_stop", {
                  type: "content_block_stop",
                  index: blockIndex,
                });
                blockIndex++;
              }
            }
          }

          if (candidate.finishReason) {
            finalStopReason =
              (candidate.finishReason as string) === "TOOL_CALL"
                ? "tool_use"
                : "end_turn";
          }
        }
      } catch (error) {
        logger.error({ err: error, chunk }, "Error processing Gemini stream");
        writeEvent(controller, "error", {
          type: "error",
          error: {
            type: "internal_server_error",
            message:
              error instanceof Error
                ? error.message
                : "An unknown error occurred while processing the stream.",
          },
        });
      }

      // 4. Send message_delta with final usage
      writeEvent(controller, "message_delta", {
        type: "message_delta",
        delta: { stop_reason: finalStopReason, stop_sequence: null },
        usage: {
          output_tokens: totalOutputTokens,
        },
      });

      // 5. Send message_stop
      writeEvent(controller, "message_stop", { type: "message_stop" });

      controller.close();
    },
  });
}
