import {
  transformRequest,
  transformResponse,
  transformStream,
} from "@/lib/adapters/gemini-to-gemini";
import type {
  GenerateContentRequest,
  GenerateContentResult,
} from "@google/generative-ai";
import { FinishReason } from "@google/generative-ai";
import { describe, expect, it } from "vitest";

describe("Gemini to Gemini Adapter", () => {
  describe("transformRequest", () => {
    it("should return the original request body", async () => {
      const requestBody: GenerateContentRequest = {
        contents: [{ role: "user", parts: [{ text: "Hello" }] }],
      };
      const result = await transformRequest("gemini-pro", requestBody);
      expect(result).toEqual(requestBody);
    });
  });

  describe("transformResponse", () => {
    it("should return the original Gemini result", () => {
      const geminiResult: GenerateContentResult = {
        response: {
          text: () => "Hi there!",
          functionCall: () => undefined,
          functionCalls: () => undefined,
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
        },
      };
      const result = transformResponse(geminiResult);
      expect(result).toEqual(geminiResult);
    });
  });

  describe("transformStream", () => {
    it("should transform a Gemini stream into an SSE string stream", async () => {
      async function* createMockStream(): AsyncGenerator<GenerateContentResult> {
        yield {
          response: {
            text: () => "Hello",
            functionCall: () => undefined,
            functionCalls: () => undefined,
            candidates: [
              {
                index: 0,
                content: { role: "model", parts: [{ text: "Hello" }] },
              },
            ],
          },
        };
        yield {
          response: {
            text: () => " World",
            functionCall: () => undefined,
            functionCalls: () => undefined,
            candidates: [
              {
                index: 0,
                content: { role: "model", parts: [{ text: " World" }] },
              },
            ],
          },
        };
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
