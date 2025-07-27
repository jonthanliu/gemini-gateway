// src/lib/transforms/openai-to-gemini.ts

import {
  Content,
  GenerateContentRequest,
  GenerateContentResult,
} from "@google/generative-ai";
import {
  OpenAIChatCompletionRequest,
  OpenAIChatMessage,
} from "../types/openai-types";

// A mapping from OpenAI roles to Gemini roles.
const roleMap: Record<string, string> = {
  user: "user",
  assistant: "model",
  system: "user", // Gemini does not have a distinct system role.
};

/**
 * Transforms an OpenAI chat completion request to a Gemini GenerateContentRequest.
 * @param openaiRequest The OpenAI chat completion request.
 * @returns A Gemini GenerateContentRequest.
 */
export function transformOpenAIRequestToGemini(
  openaiRequest: OpenAIChatCompletionRequest
): GenerateContentRequest {
  const geminiContents: Content[] = openaiRequest.messages.map(
    (message: OpenAIChatMessage) => ({
      role: roleMap[message.role],
      parts: [{ text: message.content }],
    })
  );

  // Basic parameter mapping
  const generationConfig: Record<string, unknown> = {
    temperature: openaiRequest.temperature,
    topP: openaiRequest.top_p,
    maxOutputTokens: openaiRequest.max_tokens,
    stopSequences: openaiRequest.stop,
  };

  return {
    contents: geminiContents,
    generationConfig,
  };
}

/**
 * Transforms a Gemini GenerateContentResponse to an OpenAI chat completion object.
 * This is for non-streaming responses.
 */
export function transformGeminiResponseToOpenAI(
  geminiResponse: GenerateContentResult,
  modelName: string
) {
  const choice = {
    message: {
      role: "assistant",
      content:
        geminiResponse.response.candidates?.[0]?.content.parts[0].text || "",
    },
    finish_reason: "stop", // Simplified for now
    index: 0,
  };

  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: modelName,
    choices: [choice],
    // Usage information would need to be mapped if available
  };
}

/**
 * Transforms a stream of Gemini GenerateContentResponse chunks to an OpenAI-compatible
 * server-sent event (SSE) stream.
 */
export async function* streamGeminiToOpenAI(
  geminiStream: AsyncIterable<GenerateContentResult>,
  modelName: string
): AsyncGenerator<string> {
  const streamId = `chatcmpl-${Date.now()}`;

  for await (const chunk of geminiStream) {
    const content =
      chunk.response.candidates?.[0]?.content?.parts[0]?.text || "";
    if (content) {
      const delta = {
        id: streamId,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: modelName,
        choices: [
          {
            delta: { content },
            index: 0,
            finish_reason: null,
          },
        ],
      };
      yield `data: ${JSON.stringify(delta)}\n\n`;
    }
  }

  const finalChunk = {
    id: streamId,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: modelName,
    choices: [
      {
        delta: {},
        index: 0,
        finish_reason: "stop",
      },
    ],
  };
  yield `data: ${JSON.stringify(finalChunk)}\n\n`;
  yield `data: [DONE]\n\n`;
}
