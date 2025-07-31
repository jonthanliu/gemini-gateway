import type {
  Content,
  GenerateContentParameters,
  GenerateContentResponse,
} from "@google/genai";
import {
  OpenAIChatCompletion,
  OpenAIChatCompletionRequest,
  OpenAIChatMessage,
  OpenAICompletionChoice,
  OpenAIUsage,
} from "../types/openai-types";

const roleMap: Record<string, string> = {
  user: "user",
  assistant: "model",
  system: "user",
};

export function transformRequest(
  model: string,
  openaiRequest: OpenAIChatCompletionRequest
): GenerateContentParameters {
  const geminiContents: Content[] = openaiRequest.messages.map(
    (message: OpenAIChatMessage) => ({
      role: roleMap[message.role],
      parts: [{ text: message.content }],
    })
  );

  const generationConfig: Record<string, unknown> = {};
  if (openaiRequest.temperature)
    generationConfig.temperature = openaiRequest.temperature;
  if (openaiRequest.top_p) generationConfig.topP = openaiRequest.top_p;
  if (openaiRequest.max_tokens)
    generationConfig.maxOutputTokens = openaiRequest.max_tokens;
  if (openaiRequest.stop) generationConfig.stopSequences = openaiRequest.stop;

  return {
    model,
    contents: geminiContents,
    config: generationConfig,
  };
}

export function transformResponse(
  geminiResult: GenerateContentResponse,
  model: string
): OpenAIChatCompletion {
  const choice: OpenAICompletionChoice = {
    index: 0,
    message: {
      role: "assistant",
      content: geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || "",
    },
    finish_reason: geminiResult.candidates?.[0]?.finishReason || "stop",
  };

  const usage: OpenAIUsage = {
    prompt_tokens: geminiResult.usageMetadata?.promptTokenCount || 0,
    completion_tokens: geminiResult.usageMetadata?.candidatesTokenCount || 0,
    total_tokens: geminiResult.usageMetadata?.totalTokenCount || 0,
  };

  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [choice],
    usage: usage,
  };
}

export async function* transformStream(
  geminiStream: AsyncGenerator<GenerateContentResponse>,
  model: string
): AsyncGenerator<string> {
  for await (const geminiChunk of geminiStream) {
    const text = geminiChunk.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const openAIChunk = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          delta: {
            content: text,
          },
          finish_reason: geminiChunk.candidates?.[0]?.finishReason || null,
        },
      ],
    };
    yield `data: ${JSON.stringify(openAIChunk)}\n\n`;
  }
}
