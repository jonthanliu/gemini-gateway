import {
  streamGeminiToOpenAI,
  transformGeminiResponseToOpenAI,
} from "@/lib/adapters/gemini-to-openai";
import type { GenerateContentResult } from "@google/generative-ai";
import { FinishReason } from "@google/generative-ai";
import { describe, expect, it } from "vitest";

describe("Gemini to OpenAI Adapter", () => {
  describe("transformGeminiResponseToOpenAI", () => {
    it("should transform a Gemini result to an OpenAI chat completion object", () => {
      const geminiResult: GenerateContentResult = {
        response: {
          candidates: [
            {
              content: {
                role: "model",
                parts: [{ text: "Hello from Gemini!" }],
              },
              finishReason: FinishReason.STOP,
              index: 0,
              safetyRatings: [],
            },
          ],
        },
      } as unknown as GenerateContentResult;
      const modelName = "gpt-4";
      const result = transformGeminiResponseToOpenAI(geminiResult, modelName);

      expect(result.object).toBe("chat.completion");
      expect(result.model).toBe(modelName);
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].message.role).toBe("assistant");
      expect(result.choices[0].message.content).toBe("Hello from Gemini!");
      expect(result.choices[0].finish_reason).toBe("stop");
    });
  });

  describe("streamGeminiToOpenAI", () => {
    it("should transform a Gemini stream into an OpenAI SSE stream", async () => {
      async function* createMockStream(): AsyncGenerator<GenerateContentResult> {
        yield {
          response: {
            candidates: [
              {
                index: 0,
                content: { role: "model", parts: [{ text: "Hello" }] },
              },
            ],
          },
        } as unknown as GenerateContentResult;
        yield {
          response: {
            candidates: [
              {
                index: 0,
                content: { role: "model", parts: [{ text: " World" }] },
              },
            ],
          },
        } as unknown as GenerateContentResult;
      }

      const geminiStream = createMockStream();
      const modelName = "gpt-4-turbo";
      const transformedStream = streamGeminiToOpenAI(geminiStream, modelName);

      const chunks = [];
      for await (const chunk of transformedStream) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(4); // 2 content chunks + 1 final chunk + 1 DONE chunk

      // Check first content chunk
      const firstChunk = JSON.parse(chunks[0].replace("data: ", ""));
      expect(firstChunk.object).toBe("chat.completion.chunk");
      expect(firstChunk.model).toBe(modelName);
      expect(firstChunk.choices[0].delta.content).toBe("Hello");

      // Check second content chunk
      const secondChunk = JSON.parse(chunks[1].replace("data: ", ""));
      expect(secondChunk.choices[0].delta.content).toBe(" World");

      // Check final chunk
      const finalChunk = JSON.parse(chunks[2].replace("data: ", ""));
      expect(finalChunk.choices[0].finish_reason).toBe("stop");
      expect(finalChunk.choices[0].delta).toEqual({});

      // Check DONE chunk
      expect(chunks[3]).toBe("data: [DONE]\n\n");
    });
  });
});
