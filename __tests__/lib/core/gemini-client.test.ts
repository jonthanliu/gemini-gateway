import { GeminiClient } from "@/lib/core/gemini-client";
import { describe, expect, it, vi } from "vitest";

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
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
    generateContentStream: mockGenerateContentStream,
  }));
  return {
    GoogleGenerativeAI: vi.fn(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
  };
});

describe("GeminiClient", () => {
  it("should be defined", () => {
    expect(new GeminiClient()).toBeDefined();
  });
});
