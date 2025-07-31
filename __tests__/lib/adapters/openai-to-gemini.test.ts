import { transformRequest } from "@/lib/adapters/openai-to-gemini";
import { OpenAIChatCompletionRequest } from "@/lib/types/openai-types";
import { describe, expect, it } from "vitest";

describe("OpenAI to Gemini Adapter", () => {
  it("should transform a basic OpenAI request to a Gemini request", () => {
    const openaiRequest: OpenAIChatCompletionRequest = {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello!" },
      ],
      temperature: 0.8,
      top_p: 0.9,
      max_tokens: 150,
      stream: false,
    };

    const geminiRequest = transformRequest(openaiRequest.model, openaiRequest);

    expect(geminiRequest.contents).toEqual([
      { role: "user", parts: [{ text: "You are a helpful assistant." }] },
      { role: "user", parts: [{ text: "Hello!" }] },
    ]);

    expect(geminiRequest.config).toEqual({
      temperature: 0.8,
      topP: 0.9,
      maxOutputTokens: 150,
    });
  });
});
