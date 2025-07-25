import { getSettings } from "@/lib/config/settings";
import { db } from "@/lib/db.sqlite";
import { getNextWorkingKey } from "@/lib/services/key.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the dependencies
vi.mock("@/lib/db.sqlite", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn(),
  },
}));

vi.mock("@/lib/config/settings", () => ({
  getSettings: vi.fn(),
}));

describe("Key Rotation", () => {
  beforeEach(async () => {
    // Reset modules to clear keyUsage state
    vi.resetModules();
    const { keyUsage } = await import("@/lib/services/key.service");
    keyUsage.clear();

    // Reset mocks before each test
    vi.clearAllMocks();

    // Mock getSettings to return default values
    (getSettings as vi.Mock).mockResolvedValue({
      MAX_FAILURES: 5,
    });
  });

  it("should rotate keys using in-memory LRU strategy", async () => {
    const mockKeys = [
      { id: 1, key: "key1", failCount: 0, enabled: true },
      { id: 2, key: "key2", failCount: 0, enabled: true },
      { id: 3, key: "key3", failCount: 0, enabled: true },
    ];

    // Mock the database query
    const whereMock = vi.fn().mockResolvedValue(mockKeys);
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    (db.select as vi.Mock).mockReturnValue({ from: fromMock });

    const keyUsage = new Map<string, Date>();
    keyUsage.set("key2", new Date("2025-01-02T00:00:00Z"));
    keyUsage.set("key3", new Date("2025-01-03T00:00:00Z"));
    keyUsage.set("key1", new Date("2025-01-01T00:00:00Z"));

    // key1 is the least recently used, so it should be selected first.
    const nextKey = await getNextWorkingKey(keyUsage);
    expect(nextKey).toBe("key1");

    // After key1 is used, key2 should be the next least recently used.
    const nextKey2 = await getNextWorkingKey(keyUsage);
    expect(nextKey2).toBe("key2");
  });
});
