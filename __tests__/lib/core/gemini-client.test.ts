import { geminiClient } from "@/lib/core/gemini-client";
import * as keyService from "@/lib/services/key.service";
import { CircuitBreakerError } from "@/lib/services/key.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

global.fetch = vi.fn();

describe("geminiClient", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(keyService, "getNextWorkingKey").mockResolvedValue("test-key");
    vi.spyOn(keyService, "handleApiFailure").mockResolvedValue(undefined);
    vi.spyOn(keyService, "resetKeyStatus").mockResolvedValue(undefined);
  });

  it("should succeed on the first attempt", async () => {
    const mockSuccessResponse = new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
    vi.spyOn(global, "fetch").mockResolvedValueOnce(mockSuccessResponse);

    const response = await geminiClient.generateContent("gemini-pro", {});
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(keyService.resetKeyStatus).toHaveBeenCalledWith("test-key");
  });

  it("should fail after max retries", async () => {
    const mockFailureResponse = new Response(null, { status: 500 });
    vi.spyOn(global, "fetch").mockResolvedValue(mockFailureResponse);

    await expect(
      geminiClient.generateContent("gemini-pro", {})
    ).rejects.toThrow(
      "Request failed after all retries. Please retry your request."
    );
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(keyService.handleApiFailure).toHaveBeenCalledTimes(1);
    expect(keyService.handleApiFailure).toHaveBeenCalledWith("test-key");
  });

  it("should handle 429 error immediately", async () => {
    const mock429Response = new Response(null, { status: 429 });
    vi.spyOn(global, "fetch").mockResolvedValueOnce(mock429Response);

    await expect(
      geminiClient.generateContent("gemini-pro", {})
    ).rejects.toThrow(
      "Request failed with status 429. Please retry your request."
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(keyService.handleApiFailure).toHaveBeenCalledTimes(1);
    expect(keyService.handleApiFailure).toHaveBeenCalledWith(
      "test-key",
      undefined
    );
  });

  it("should throw error if no keys are available", async () => {
    vi.spyOn(keyService, "getNextWorkingKey").mockRejectedValue(
      new Error("No keys available")
    );

    await expect(
      geminiClient.generateContent("gemini-pro", {})
    ).rejects.toThrow("Service unavailable: No API keys available.");
  });

  it("should throw error if circuit breaker is tripped", async () => {
    vi.spyOn(keyService, "getNextWorkingKey").mockRejectedValue(
      new CircuitBreakerError(
        "Circuit breaker is tripped",
        new Date(Date.now() + 10000)
      )
    );

    await expect(
      geminiClient.generateContent("gemini-pro", {})
    ).rejects.toThrow("Service unavailable: All API keys are in cooldown.");
  });
});
