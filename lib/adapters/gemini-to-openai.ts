import type { GenerateContentResult } from "@google/generative-ai";

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
        geminiResponse.response.candidates?.[0]?.content?.parts?.[0]?.text ||
        "",
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
  let firstChunk = true;

  for await (const chunk of geminiStream) {
    // Check if the first chunk is a complete response
    if (
      firstChunk &&
      chunk.response.candidates &&
      chunk.response.candidates?.[0]?.finishReason
    ) {
      const openAIResponse = transformGeminiResponseToOpenAI(chunk, modelName);
      yield `data: ${JSON.stringify(openAIResponse)}\n\n`;
      yield `data: [DONE]\n\n`;
      return;
    }
    firstChunk = false;

    const content =
      chunk.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
