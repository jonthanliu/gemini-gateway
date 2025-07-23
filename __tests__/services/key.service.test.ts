import { prisma } from "@/lib/db";
import {
  getNextWorkingKey,
  handleApiFailure,
  resetKeyFailureCount,
} from "@/lib/services/key.service";
import { beforeEach, expect, test, vi } from "vitest";

// Mock the prisma client
vi.mock("@/lib/db", () => ({
  prisma: {
    apiKey: {
      findMany: vi.fn(), // Add findMany to the mock
      update: vi.fn(),
    },
  },
}));

// Mock settings
vi.mock("@/lib/settings", () => ({
  getSettings: vi.fn().mockResolvedValue({ MAX_FAILURES: 3 }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("getNextWorkingKey should return a random key from the valid keys", async () => {
  const mockKeys = [
    { id: 1, key: "test-key-123", lastUsed: new Date() },
    { id: 2, key: "test-key-456", lastUsed: new Date() },
  ];
  (prisma.apiKey.findMany as any).mockResolvedValue(mockKeys);

  const key = await getNextWorkingKey();

  expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
    where: {
      enabled: true,
      failCount: {
        lt: 3,
      },
    },
    orderBy: {
      lastUsed: "asc",
    },
  });
  const updatedKey = mockKeys.find((k) => k.key === key);
  expect(prisma.apiKey.update).toHaveBeenCalledWith({
    where: { id: updatedKey.id },
    data: { lastUsed: expect.any(Date) },
  });
  expect(mockKeys.map((k) => k.key)).toContain(key);
});

test("getNextWorkingKey should throw error if no keys are available", async () => {
  (prisma.apiKey.findMany as any).mockResolvedValue([]); // Return an empty array
  await expect(getNextWorkingKey()).rejects.toThrow("No API keys available");
});

test("handleApiFailure should increment the failCount and update lastChecked", async () => {
  await handleApiFailure("test-key-456");
  expect(prisma.apiKey.update).toHaveBeenCalledWith({
    where: { key: "test-key-456" },
    data: {
      failCount: { increment: 1 },
      lastChecked: expect.any(Date), // Expect lastChecked to be updated
    },
  });
});

test("resetKeyFailureCount should reset the failCount to 0 and update lastChecked", async () => {
  await resetKeyFailureCount("test-key-789");
  expect(prisma.apiKey.update).toHaveBeenCalledWith({
    where: { key: "test-key-789" },
    data: {
      failCount: 0,
      lastChecked: expect.any(Date), // Expect lastChecked to be updated
    },
  });
});
