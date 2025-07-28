import { convertAnthropicToGemini } from "@/lib/adapters/anthropic-to-gemini";
import type * as Anthropic from "@anthropic-ai/sdk/resources/messages";
import { describe, expect, it } from "vitest";

describe("convertAnthropicToGemini", () => {
  it("should convert a simple text message", () => {
    const anthropicRequest: Anthropic.MessageCreateParams = {
      model: "claude-3-opus-20240229",
      messages: [{ role: "user", content: "Hello, world!" }],
      max_tokens: 1024,
    };

    const geminiRequest = convertAnthropicToGemini(anthropicRequest);

    expect(geminiRequest.contents).toEqual([
      {
        role: "user",
        parts: [{ text: "Hello, world!" }],
      },
    ]);
    expect(geminiRequest.generationConfig?.maxOutputTokens).toBe(1024);
  });

  it("should handle a system prompt", () => {
    const anthropicRequest: Anthropic.MessageCreateParams = {
      model: "claude-3-opus-20240229",
      system: "You are a helpful assistant.",
      messages: [{ role: "user", content: "Hello!" }],
      max_tokens: 1024,
    };

    const geminiRequest = convertAnthropicToGemini(anthropicRequest);

    expect(geminiRequest.systemInstruction).toEqual({
      role: "user",
      parts: [{ text: "You are a helpful assistant." }],
    });
    expect(geminiRequest.contents).toHaveLength(1);
  });

  it("should convert roles correctly", () => {
    const anthropicRequest: Anthropic.MessageCreateParams = {
      model: "claude-3-opus-20240229",
      messages: [
        { role: "user", content: "User message" },
        { role: "assistant", content: "Assistant message" },
      ],
      max_tokens: 1024,
    };

    const geminiRequest = convertAnthropicToGemini(anthropicRequest);

    expect(geminiRequest.contents[0].role).toBe("user");
    expect(geminiRequest.contents[1].role).toBe("model");
  });

  it("should convert image content", () => {
    const anthropicRequest: Anthropic.MessageCreateParams = {
      model: "claude-3-opus-20240229",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: "iVBORw0KGgo...",
              },
            },
            { type: "text", text: "What is in this image?" },
          ],
        },
      ],
      max_tokens: 1024,
    };

    const geminiRequest = convertAnthropicToGemini(anthropicRequest);

    expect(geminiRequest.contents[0].parts).toHaveLength(2);
    expect(geminiRequest.contents[0].parts).toContainEqual({
      inlineData: {
        mimeType: "image/png",
        data: "iVBORw0KGgo...",
      },
    });
    expect(geminiRequest.contents[0].parts).toContainEqual({
      text: "What is in this image?",
    });
  });
});
