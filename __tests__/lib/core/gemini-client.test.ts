import { GeminiClient } from "@/lib/core/gemini-client";
import { GenerateContentResult } from "@google/generative-ai";
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

vi.mock("@google/generative-ai", () => {
  const mockGenerateContent = vi.fn();
  const mockGenerateContentStream = vi.fn();
  return {
    GoogleGenerativeAI: vi.fn(() => ({
      getGenerativeModel: vi.fn(() => ({
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream,
      })),
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
      contents: [{ role: "user", parts: [{ text: "Hello" }] }],
    };

    // Mock the dependencies to return successful values
    const keyService = await import("@/lib/services/key.service");
    (
      keyService.getNextWorkingKey as MockedFunction<
        typeof keyService.getNextWorkingKey
      >
    ).mockResolvedValue("test-api-key");

    const generativeAi = await import("@google/generative-ai");
    const mockGenerateContent = new generativeAi.GoogleGenerativeAI(
      ""
    ).getGenerativeModel({ model: "" }).generateContent;
    (
      mockGenerateContent as MockedFunction<typeof mockGenerateContent>
    ).mockResolvedValue({
      response: {
        candidates: [],
        usageMetadata: {},
      },
    } as unknown as GenerateContentResult);

    await client.generateContent(model, request);

    expect(keyService.getNextWorkingKey).toHaveBeenCalled();
    expect(mockGenerateContent).toHaveBeenCalledWith(request);
    expect(keyService.resetKeyStatus).toHaveBeenCalledWith("test-api-key");
  });
});
