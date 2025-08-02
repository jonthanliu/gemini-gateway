import {
  transformRequest,
  transformResponse,
  transformStream,
} from "@/lib/adapters/gemini-to-gemini";
import type {
  GenerateContentParameters,
  GenerateContentResponse,
} from "@google/genai";
import { FinishReason } from "@google/genai";
import { describe, expect, it } from "vitest";

describe("Gemini to Gemini Adapter", () => {
  describe("transformRequest", () => {
    it("should add a config object if none is provided", async () => {
      const requestBody: GenerateContentParameters = {
        model: "gemini-pro",
        contents: [{ role: "user", parts: [{ text: "Hello" }] }],
      };
      const result = await transformRequest("gemini-pro", requestBody);
      const expected = {
        ...requestBody,
        config: {},
      };
      expect(result).toEqual(expected);
    });
  });

  describe("transformResponse", () => {
    it("should return the original Gemini result", () => {
      const geminiResult: GenerateContentResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "Hi there!" }] },
            finishReason: FinishReason.STOP,
            index: 0,
            safetyRatings: [],
          },
        ],
        usageMetadata: {
          promptTokenCount: 1,
          candidatesTokenCount: 2,
          totalTokenCount: 3,
        },
      } as unknown as GenerateContentResponse;
      const result = transformResponse(geminiResult);
      expect(result).toEqual(geminiResult);
    });
  });

  describe("transformStream", () => {
    it("should transform a Gemini stream into an SSE string stream", async () => {
      async function* createMockStream(): AsyncGenerator<GenerateContentResponse> {
        yield {
          candidates: [
            {
              index: 0,
              content: { role: "model", parts: [{ text: "Hello" }] },
            },
          ],
        } as unknown as GenerateContentResponse;
        yield {
          candidates: [
            {
              index: 0,
              content: { role: "model", parts: [{ text: " World" }] },
            },
          ],
        } as unknown as GenerateContentResponse;
      }

      const geminiStream = createMockStream();
      const transformedStream = transformStream(geminiStream);

      const chunks = [];
      for await (const chunk of transformedStream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        `data: ${JSON.stringify({
          candidates: [
            {
              index: 0,
              content: { role: "model", parts: [{ text: "Hello" }] },
            },
          ],
        })}\n\n`,
        `data: ${JSON.stringify({
          candidates: [
            {
              index: 0,
              content: { role: "model", parts: [{ text: " World" }] },
            },
          ],
        })}\n\n`,
      ]);
    });
  });
});
