import {
  transformOpenAIRequestToGemini,
} from "@/lib/adapters/openai-to-gemini";
import {
  streamGeminiToOpenAI,
  transformGeminiResponseToOpenAI,
} from "@/lib/adapters/gemini-to-openai";
import { OpenAIChatCompletionRequest } from "@/lib/types/openai-types";
import { FinishReason, GenerateContentResult } from "@google/generative-ai";
import { describe, expect, it } from "vitest";

describe("transformOpenAIRequestToGemini", () => {
  it("should transform an OpenAI request to a Gemini request", () => {
    const openaiRequest: OpenAIChatCompletionRequest = {
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, world!" },
      ],
      temperature: 0.8,
      top_p: 0.9,
      max_tokens: 1024,
      stop: ["\n"],
    };

    const geminiRequest = transformOpenAIRequestToGemini(openaiRequest);

    expect(geminiRequest.contents).toEqual([
      { role: "user", parts: [{ text: "You are a helpful assistant." }] },
      { role: "user", parts: [{ text: "Hello, world!" }] },
    ]);
    expect(geminiRequest.generationConfig).toEqual({
      temperature: 0.8,
      topP: 0.9,
      maxOutputTokens: 1024,
      stopSequences: ["\n"],
    });
  });
});

describe("transformGeminiResponseToOpenAI", () => {
  it("should transform a Gemini response to an OpenAI response", () => {
    const geminiResponse: GenerateContentResult = {
      response: {
        candidates: [
          {
            content: { parts: [{ text: "Hello, OpenAI!" }], role: "model" },
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
        text: () => "Hello, OpenAI!",
        functionCall: () => undefined,
        functionCalls: () => undefined,
      },
    };

    const openaiResponse = transformGeminiResponseToOpenAI(
      geminiResponse,
      "gemini-pro"
    );

    expect(openaiResponse.choices[0].message.content).toBe("Hello, OpenAI!");
    expect(openaiResponse.model).toBe("gemini-pro");
  });
});

describe("streamGeminiToOpenAI", () => {
  it("should transform a Gemini stream to an OpenAI stream", async () => {
    async function* createMockGeminiStream(): AsyncGenerator<GenerateContentResult> {
      yield {
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
      };
    }

    const geminiStream = createMockGeminiStream();
    const openaiStream = streamGeminiToOpenAI(geminiStream, "gemini-pro");
    let result = "";
    for await (const chunk of openaiStream) {
      result += chunk;
    }

    expect(result).toContain("data: ");
    expect(result).toContain(`"model":"gemini-pro"`);
    expect(result).toContain(`"content":"Hello"`);
    expect(result).toContain("data: [DONE]");
  });
});
