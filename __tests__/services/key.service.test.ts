import { db } from "@/lib/db.sqlite";
import { apiKeys, requestLogs } from "@/lib/db/schema";
import { getAllKeys } from "@/lib/services/key.service";
import { updateSetting } from "@/lib/settings";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Key Service - getAllKeys", () => {
  beforeEach(async () => {
    // Set up a clean state for each test
    await db.delete(apiKeys);
    await db.delete(requestLogs);
    await updateSetting("MAX_FAILURES", "5");

    // Insert test data
    await db.insert(apiKeys).values([
      { id: 1, key: "key-01", failCount: 0, enabled: true },
      { id: 2, key: "key-02", failCount: 6, enabled: true }, // Not working
      { id: 3, key: "key-03", failCount: 2, enabled: false }, // Disabled
      { id: 4, key: "key-04", failCount: 0, enabled: true }, // Unused
    ]);

    const now = Math.floor(Date.now() / 1000);
    await db.insert(requestLogs).values([
      // Logs for key-01
      {
        apiKey: "key-01",
        isSuccess: true,
        model: "test",
        statusCode: 200,
        latency: 100,
        createdAt: new Date((now - 100) * 1000),
      },
      {
        apiKey: "key-01",
        isSuccess: true,
        model: "test",
        statusCode: 200,
        latency: 100,
      },
      {
        apiKey: "key-01",
        isSuccess: false,
        model: "test",
        statusCode: 500,
        latency: 100,
      },
      // Logs for key-02
      {
        apiKey: "key-02",
        isSuccess: false,
        model: "test",
        statusCode: 500,
        latency: 100,
      },
      // Logs for key-03
      {
        apiKey: "key-03",
        isSuccess: true,
        model: "test",
        statusCode: 200,
        latency: 100,
        createdAt: new Date((now - 200) * 1000),
      },
    ]);
  });

  afterEach(async () => {
    // Clean up the database after each test
    await db.delete(apiKeys);
    await db.delete(requestLogs);
  });

  it("should return all keys with correctly aggregated statistics", async () => {
    const keys = await getAllKeys();

    // It should return all 4 keys
    expect(keys).toHaveLength(4);

    // Find specific keys to verify their stats
    const key01 = keys.find((k) => k.key === "key-01");
    const key02 = keys.find((k) => k.key === "key-02");
    const key03 = keys.find((k) => k.key === "key-03");
    const key04 = keys.find((k) => k.key === "key-04");

    // Assertions for key-01
    expect(key01).toBeDefined();
    expect(key01?.totalRequests).toBe(3);
    expect(key01?.successfulRequests).toBe(2);
    expect(key01?.failedRequests).toBe(1);
    expect(key01?.isWorking).toBe(true);
    expect(key01?.lastUsed).toBeInstanceOf(Date);

    // Assertions for key-02 (not working)
    expect(key02).toBeDefined();
    expect(key02?.totalRequests).toBe(1);
    expect(key02?.successfulRequests).toBe(0);
    expect(key02?.failedRequests).toBe(1);
    expect(key02?.isWorking).toBe(false);

    // Assertions for key-03 (disabled)
    expect(key03).toBeDefined();
    expect(key03?.totalRequests).toBe(1);
    expect(key03?.isWorking).toBe(false);

    // Assertions for key-04 (unused)
    expect(key04).toBeDefined();
    expect(key04?.totalRequests).toBe(0);
    expect(key04?.successfulRequests).toBe(0);
    expect(key04?.failedRequests).toBe(0);
    expect(key04?.isWorking).toBe(true);
    expect(key04?.lastUsed).toBeNull();
  });
});
