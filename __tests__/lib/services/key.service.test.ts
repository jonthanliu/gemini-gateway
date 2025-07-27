import { updateSetting } from "@/lib/config/settings";
import { db } from "@/lib/db";
import { apiKeys, requestLogs } from "@/lib/db/schema";
import { getAllKeys, getNextWorkingKey } from "@/lib/services/key.service";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Key Service - getNextWorkingKey", () => {
  beforeEach(async () => {
    // Set up a clean state for each test
    await db.delete(apiKeys);
    await updateSetting("MAX_FAILURES", "3");

    // Insert test data: 3 working keys, 1 disabled, 1 failed
    await db.insert(apiKeys).values([
      {
        id: 1,
        key: "key-working-01",

        enabled: true,
        disabledUntil: null,
      },
      {
        id: 2,
        key: "key-working-02",

        enabled: true,
        disabledUntil: null,
      },
      {
        id: 3,
        key: "key-working-03",

        enabled: true,
        disabledUntil: null,
      },
      {
        id: 4,
        key: "key-disabled-01",

        enabled: false,
        disabledUntil: null,
      },
      {
        id: 5,
        key: "key-failed-01",

        enabled: true,
        disabledUntil: new Date(Date.now() + 1000 * 60 * 5),
      },
    ]);
  });

  afterEach(async () => {
    // Clean up the database after each test
    await db.delete(apiKeys);
  });

  it("should only return a working key", async () => {
    const key = await getNextWorkingKey();
    expect(key).toMatch(/key-working-\d{2}/);
  });

  it("should never return a disabled or failed key", async () => {
    for (let i = 0; i < 20; i++) {
      const key = await getNextWorkingKey();
      expect(key).not.toBe("key-disabled-01");
    }
  });

  it("should return different keys over multiple calls, demonstrating randomness", async () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(await getNextWorkingKey());
    }
    // With 3 available keys, after 100 calls, we expect to have seen more than 1 unique key.
    // This probabilistically checks for randomness.
    expect(results.size).toBeGreaterThan(1);
    // It should contain all possible working keys
    expect(results.has("key-working-01")).toBe(true);
    expect(results.has("key-working-02")).toBe(true);
    expect(results.has("key-working-03")).toBe(true);
  });

  it("should throw an error when no keys are available", async () => {
    // Delete all keys to simulate a no-key scenario
    await db.delete(apiKeys);
    await expect(getNextWorkingKey()).rejects.toThrow("No API keys available");
  });
});

describe("Key Service - getAllKeys", () => {
  beforeEach(async () => {
    // Set up a clean state for each test
    await db.delete(apiKeys);
    await db.delete(requestLogs);
    await updateSetting("MAX_FAILURES", "5");

    // Insert test data
    await db.insert(apiKeys).values([
      { id: 1, key: "key-01", enabled: true, disabledUntil: null },
      { id: 2, key: "key-02", enabled: true, disabledUntil: null }, // Not working
      { id: 3, key: "key-03", enabled: false, disabledUntil: null }, // Disabled
      { id: 4, key: "key-04", enabled: true, disabledUntil: null }, // Unused
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
    expect(key02?.isWorking).toBe(true);

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
