import { geminiClient } from "@/lib/core/gemini_client";
import * as keyService from "@/lib/services/key.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

global.fetch = vi.fn();

describe("geminiClient", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should succeed on the first attempt", async () => {
    const mockSuccessResponse = new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
      }
    );
    vi.spyOn(global, "fetch").mockResolvedValueOnce(mockSuccessResponse);
    vi.spyOn(keyService, "getNextWorkingKey").mockResolvedValue("test-key");
    vi.spyOn(keyService, "resetKeyStatus").mockResolvedValue(undefined);

    const response = await geminiClient.generateContent("gemini-pro", {});
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(keyService.resetKeyStatus).toHaveBeenCalledWith("test-key");
  });

  it("should retry on failure and succeed on the second attempt", async () => {
    const mockFailureResponse = new Response(null, { status: 500 });
    const mockSuccessResponse = new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
      }
    );
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(mockFailureResponse)
      .mockResolvedValueOnce(mockSuccessResponse);
    vi.spyOn(keyService, "getNextWorkingKey").mockResolvedValue("test-key");
    vi.spyOn(keyService, "handleApiFailure").mockResolvedValue(undefined);
    vi.spyOn(keyService, "resetKeyStatus").mockResolvedValue(undefined);

    const response = await geminiClient.generateContent("gemini-pro", {});
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(keyService.handleApiFailure).toHaveBeenCalledTimes(1);
    expect(keyService.resetKeyStatus).toHaveBeenCalledTimes(1);
  });

  it("should fail after max retries", async () => {
    const mockFailureResponse = new Response(null, { status: 500 });
    vi.spyOn(global, "fetch").mockResolvedValue(mockFailureResponse);
    vi.spyOn(keyService, "getNextWorkingKey").mockResolvedValue("test-key");
    vi.spyOn(keyService, "handleApiFailure").mockResolvedValue(undefined);

    await expect(
      geminiClient.generateContent("gemini-pro", {})
    ).rejects.toThrow("Request failed with status 500");
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(keyService.handleApiFailure).toHaveBeenCalledTimes(3);
  });
});
