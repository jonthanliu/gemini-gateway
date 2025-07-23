import { apiKeys } from "@/lib/db/schema";
import {
  checkAndReactivateKeys,
  getAllKeys,
  getNextWorkingKey,
  handleApiFailure,
  resetKeyFailureCount,
  verifyKey,
} from "@/lib/services/key.service";
import { getSettings } from "@/lib/settings";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Per Vitest documentation, use vi.hoisted to share variables with vi.mock
const mocks = vi.hoisted(() => {
  return {
    select: vi.fn(),
    update: vi.fn(),
  };
});

vi.mock("db", () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
  },
}));

vi.mock("@/lib/settings", () => ({
  getSettings: vi.fn(),
}));

vi.mock("@google/generative-ai", () => {
  const mockGenerateContent = vi.fn();
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
  }));
  const mockGoogleGenerativeAI = vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  }));

  return {
    GoogleGenerativeAI: mockGoogleGenerativeAI,
    mockGetGenerativeModel,
    mockGenerateContent,
  };
});

describe("Key Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockClear();
    mocks.update.mockClear();

    (getSettings as vi.Mock).mockResolvedValue({
      MAX_FAILURES: 3,
      HEALTH_CHECK_MODEL: "gemini-pro",
    });
  });

  describe("getNextWorkingKey", () => {
    it("should return the least recently used key", async () => {
      const mockKeys = [
        {
          id: 1,
          key: "key1",
          lastUsed: new Date("2023-01-01"),
          failCount: 0,
          enabled: true,
        },
      ];

      // Setup the mock chain for this specific test
      const limitMock = vi.fn().mockResolvedValue(mockKeys);
      const orderByMock = vi.fn(() => ({ limit: limitMock }));
      const whereMock = vi.fn(() => ({ orderBy: orderByMock }));
      const fromMock = vi.fn(() => ({ where: whereMock }));
      mocks.select.mockReturnValue({ from: fromMock });

      const updateWhereMock = vi.fn().mockResolvedValue(undefined);
      const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
      mocks.update.mockReturnValue({ set: updateSetMock });

      const key = await getNextWorkingKey();
      expect(key).toBe("key1");
      expect(mocks.update).toHaveBeenCalledWith(apiKeys);
    });

    it("should throw an error if no keys are available", async () => {
      const limitMock = vi.fn().mockResolvedValue([]);
      const orderByMock = vi.fn(() => ({ limit: limitMock }));
      const whereMock = vi.fn(() => ({ orderBy: orderByMock }));
      const fromMock = vi.fn(() => ({ where: whereMock }));
      mocks.select.mockReturnValue({ from: fromMock });

      await expect(getNextWorkingKey()).rejects.toThrow(
        "No API keys available."
      );
    });
  });

  describe("handleApiFailure", () => {
    it("should increment the fail count for a key", async () => {
      const mockKeyResult = [{ failCount: 1 }];

      const whereMockSelect = vi.fn().mockResolvedValue(mockKeyResult);
      const fromMockSelect = vi.fn(() => ({ where: whereMockSelect }));
      mocks.select.mockReturnValue({ from: fromMockSelect });

      const whereMockUpdate = vi.fn().mockResolvedValue(undefined);
      const setMockUpdate = vi.fn(() => ({ where: whereMockUpdate }));
      mocks.update.mockReturnValue({ set: setMockUpdate });

      await handleApiFailure("key1");

      expect(mocks.update).toHaveBeenCalledWith(apiKeys);
      expect(setMockUpdate).toHaveBeenCalledWith({
        failCount: 2,
        lastChecked: expect.any(Date),
      });
      expect(whereMockUpdate).toHaveBeenCalledWith(eq(apiKeys.key, "key1"));
    });
  });

  describe("resetKeyFailureCount", () => {
    it("should reset the fail count for a key to 0", async () => {
      const whereMockUpdate = vi.fn().mockResolvedValue(undefined);
      const setMockUpdate = vi.fn(() => ({ where: whereMockUpdate }));
      mocks.update.mockReturnValue({ set: setMockUpdate });

      await resetKeyFailureCount("key1");

      expect(mocks.update).toHaveBeenCalledWith(apiKeys);
      expect(setMockUpdate).toHaveBeenCalledWith({
        failCount: 0,
        lastChecked: expect.any(Date),
      });
      expect(whereMockUpdate).toHaveBeenCalledWith(eq(apiKeys.key, "key1"));
    });
  });

  describe("getAllKeys", () => {
    it("should return all keys with their working status", async () => {
      const mockKeys = [
        {
          key: "key1",
          failCount: 0,
          enabled: true,
          lastUsed: new Date(),
          lastChecked: new Date(),
          createdAt: new Date(),
        },
        {
          key: "key2",
          failCount: 4,
          enabled: true,
          lastUsed: new Date(),
          lastChecked: new Date(),
          createdAt: new Date(),
        },
        {
          key: "key3",
          failCount: 0,
          enabled: false,
          lastUsed: new Date(),
          lastChecked: new Date(),
          createdAt: new Date(),
        },
      ];
      const orderByMock = vi.fn().mockResolvedValue(mockKeys);
      const fromMock = vi.fn(() => ({ orderBy: orderByMock }));
      mocks.select.mockReturnValue({ from: fromMock });

      const keys = await getAllKeys();

      expect(keys).toHaveLength(3);
      expect(keys[0].isWorking).toBe(true);
      expect(keys[1].isWorking).toBe(false);
      expect(keys[2].isWorking).toBe(false);
    });
  });

  describe("verifyKey", () => {
    it("should return true and reset fail count on successful verification", async () => {
      const { mockGenerateContent } = await import("@google/generative-ai");
      (mockGenerateContent as vi.Mock).mockResolvedValue({
        response: { text: () => "hi" },
      });
      const result = await verifyKey("key1");

      expect(result).toBe(true);
      // This test implicitly calls resetKeyFailureCount, so we check its mock
      expect(mocks.update).toHaveBeenCalledWith(apiKeys);
    });

    it("should return false on failed verification", async () => {
      const { mockGenerateContent } = await import("@google/generative-ai");
      (mockGenerateContent as vi.Mock).mockRejectedValue(
        new Error("API error")
      );
      const result = await verifyKey("key1");
      expect(result).toBe(false);
    });
  });

  describe("checkAndReactivateKeys", () => {
    it("should attempt to verify all inactive keys", async () => {
      const inactiveKeys = [
        { key: "key-inactive-1", failCount: 5, enabled: true },
        { key: "key-inactive-2", failCount: 3, enabled: true },
      ];
      const whereMock = vi.fn().mockResolvedValue(inactiveKeys);
      const fromMock = vi.fn(() => ({ where: whereMock }));
      mocks.select.mockReturnValue({ from: fromMock });

      const { mockGenerateContent } = await import("@google/generative-ai");
      (mockGenerateContent as vi.Mock).mockResolvedValue({
        response: { text: () => "hi" },
      });

      await checkAndReactivateKeys();

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });
  });
});
