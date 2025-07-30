import { GeminiClient } from "@/lib/core/gemini-client";
import { GenerateContentResponse } from "@google/genai";
import { describe, expect, it, MockedFunction, vi } from "vitest";

// Mock the dependencies
vi.mock("@/lib/services/key.service", () => ({
  getNextWorkingKey: vi.fn(),
  handleApiFailure: vi.fn(),
  resetKeyStatus: vi.fn(),
}));

vi.mock("@/lib/services/logging.service", () => ({
  logRequest: vi.fn(),
}));

vi.mock("@google/genai", () => {
  const mockGenerateContent = vi.fn();
  const mockGenerateContentStream = vi.fn();
  return {
    GoogleGenAI: vi.fn(() => ({
      models: {
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream,
      },
    })),
  };
});

describe("GeminiClient", () => {
  it("should be defined", () => {
    expect(new GeminiClient()).toBeDefined();
  });

  it("should call generateContent with the correct parameters", async () => {
    const client = new GeminiClient();
    const model = "gemini-pro";
    const request = {
      model,
      contents: [{ role: "user", parts: [{ text: "Hello" }] }],
    };

    // Mock the dependencies to return successful values
    const keyService = await import("@/lib/services/key.service");
    (
      keyService.getNextWorkingKey as MockedFunction<
        typeof keyService.getNextWorkingKey
      >
    ).mockResolvedValue("test-api-key");

    const genai = await import("@google/genai");
    const mockGenerateContent = new genai.GoogleGenAI({}).models
      .generateContent;
    (
      mockGenerateContent as MockedFunction<typeof mockGenerateContent>
    ).mockResolvedValue({
      candidates: [],
      usageMetadata: {},
    } as unknown as GenerateContentResponse);

    await client.generateContent(model, request);

    expect(keyService.getNextWorkingKey).toHaveBeenCalled();
    expect(mockGenerateContent).toHaveBeenCalledWith(request);
    expect(keyService.resetKeyStatus).toHaveBeenCalledWith("test-api-key");
  });
});
