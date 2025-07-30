import {
  Content,
  GenerateContentRequest,
  GenerateContentResult,
} from "@google/generative-ai";
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
  openaiRequest: OpenAIChatCompletionRequest
): GenerateContentRequest {
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
    contents: geminiContents,
    generationConfig,
  };
}

export function transformResponse(
  geminiResult: GenerateContentResult,
  model: string
): OpenAIChatCompletion {
  const choice: OpenAICompletionChoice = {
    index: 0,
    message: {
      role: "assistant",
      content:
        geminiResult.response.candidates?.[0]?.content?.parts?.[0]?.text || "",
    },
    finish_reason:
      geminiResult.response.candidates?.[0]?.finishReason || "stop",
  };

  const usage: OpenAIUsage = {
    prompt_tokens: geminiResult.response.usageMetadata?.promptTokenCount || 0,
    completion_tokens:
      geminiResult.response.usageMetadata?.candidatesTokenCount || 0,
    total_tokens: geminiResult.response.usageMetadata?.totalTokenCount || 0,
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
  geminiStream: AsyncGenerator<GenerateContentResult>,
  model: string
): AsyncGenerator<string> {
  for await (const geminiChunk of geminiStream) {
    const text =
      geminiChunk.response.candidates?.[0]?.content?.parts?.[0]?.text || "";

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
          finish_reason:
            geminiChunk.response.candidates?.[0]?.finishReason || null,
        },
      ],
    };
    yield `data: ${JSON.stringify(openAIChunk)}\n\n`;
  }
}
