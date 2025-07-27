import { streamGeminiToAnthropic } from "@/lib/adapters/gemini-to-anthropic";
import {
  FinishReason,
  type GenerateContentResult,
} from "@google/generative-ai";
import { describe, expect, it } from "vitest";

async function* createMockGeminiStream(
  chunks: GenerateContentResult[]
): AsyncGenerator<GenerateContentResult> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

describe("streamGeminiToAnthropic", () => {
  it("should correctly convert a Gemini stream to an Anthropic stream", async () => {
    const mockGeminiChunks: GenerateContentResult[] = [
      {
        response: {
          candidates: [
            {
              content: { parts: [{ text: "Hello" }], role: "model" },
              index: 0,
              finishReason: FinishReason.STOP,
              safetyRatings: [],
            },
          ],
          usageMetadata: {
            candidatesTokenCount: 1,
            promptTokenCount: 0,
            totalTokenCount: 1,
          },
          text: () => "Hello",
          functionCall: () => undefined,
          functionCalls: () => undefined,
        },
      },
      {
        response: {
          candidates: [
            {
              content: { parts: [{ text: ", " }], role: "model" },
              index: 0,
              finishReason: FinishReason.STOP,
              safetyRatings: [],
            },
          ],
          usageMetadata: {
            candidatesTokenCount: 1,
            promptTokenCount: 0,
            totalTokenCount: 1,
          },
          text: () => ", ",
          functionCall: () => undefined,
          functionCalls: () => undefined,
        },
      },
      {
        response: {
          candidates: [
            {
              content: { parts: [{ text: "world!" }], role: "model" },
              index: 0,
              finishReason: FinishReason.STOP,
              safetyRatings: [],
            },
          ],
          usageMetadata: {
            candidatesTokenCount: 1,
            promptTokenCount: 0,
            totalTokenCount: 1,
          },
          text: () => "world!",
          functionCall: () => undefined,
          functionCalls: () => undefined,
        },
      },
    ];

    const geminiStream = createMockGeminiStream(mockGeminiChunks);
    const anthropicStream = streamGeminiToAnthropic(geminiStream);
    const reader = anthropicStream.getReader();
    const decoder = new TextDecoder();
    let result = "";
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      if (readerDone) {
        done = true;
        break;
      }
      result += decoder.decode(value);
    }

    expect(result).toContain("event: message_start");
    expect(result).toContain("event: content_block_start");
    expect(result).toContain("event: content_block_delta");
    expect(result).toContain("event: content_block_stop");
    expect(result).toContain("event: message_delta");
    expect(result).toContain("event: message_stop");
    expect(result).toContain(`"text":"Hello"`);
    expect(result).toContain(`"text":", "`);
    expect(result).toContain(`"text":"world!"`);
  });
});
