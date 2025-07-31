import { streamGeminiToAnthropic } from "@/lib/adapters/gemini-to-anthropic";
import { FinishReason, type GenerateContentResponse } from "@google/genai";
import { describe, expect, it } from "vitest";

async function* createMockGeminiStream(
  chunks: GenerateContentResponse[]
): AsyncGenerator<GenerateContentResponse> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

describe("streamGeminiToAnthropic", () => {
  it("should correctly convert a Gemini stream to an Anthropic stream", async () => {
    const mockGeminiChunks: GenerateContentResponse[] = [
      {
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
      } as unknown as GenerateContentResponse,
      {
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
      } as unknown as GenerateContentResponse,
      {
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
      } as unknown as GenerateContentResponse,
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
