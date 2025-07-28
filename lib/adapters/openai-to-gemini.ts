// src/lib/transforms/openai-to-gemini.ts

import {
  Content,
  GenerateContentRequest,
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
