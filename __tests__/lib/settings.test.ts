import { settings as settingsTable } from "@/lib/db/schema";
import { getSettings, updateSetting } from "@/lib/settings";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Use the same vi.hoisted pattern for mocking 'db'
const mocks = vi.hoisted(() => {
  return {
    select: vi.fn(),
    insert: vi.fn(),
  };
});

vi.mock("db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
  },
}));

describe("Settings Service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockClear();
    mocks.insert.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getSettings", () => {
    it("should return default settings if DB and env are empty", async () => {
      const fromMock = vi.fn().mockResolvedValue([]);
      mocks.select.mockReturnValue({ from: fromMock });

      const settings = await getSettings();
      expect(settings.MAX_FAILURES).toBe(3);
      expect(settings.TOOLS_CODE_EXECUTION_ENABLED).toBe(false);
    });

    it("should prioritize environment variables over defaults", async () => {
      process.env.MAX_FAILURES = "5";
      process.env.TOOLS_CODE_EXECUTION_ENABLED = "true";

      const fromMock = vi.fn().mockResolvedValue([]);
      mocks.select.mockReturnValue({ from: fromMock });

      const settings = await getSettings();
      expect(settings.MAX_FAILURES).toBe(5);
      expect(settings.TOOLS_CODE_EXECUTION_ENABLED).toBe(true);
    });

    it("should prioritize database values over env and defaults", async () => {
      process.env.MAX_FAILURES = "5";
      const dbSettings = [
        { key: "MAX_FAILURES", value: "10" },
        { key: "HEALTH_CHECK_MODEL", value: "test-model" },
      ];
      const fromMock = vi.fn().mockResolvedValue(dbSettings);
      mocks.select.mockReturnValue({ from: fromMock });

      const settings = await getSettings();
      expect(settings.MAX_FAILURES).toBe(10);
      expect(settings.HEALTH_CHECK_MODEL).toBe("test-model");
    });

    it("should correctly parse JSON settings", async () => {
      const dbSettings = [
        {
          key: "SAFETY_SETTINGS",
          value: JSON.stringify([{ category: "TEST", threshold: "BLOCK" }]),
        },
      ];
      const fromMock = vi.fn().mockResolvedValue(dbSettings);
      mocks.select.mockReturnValue({ from: fromMock });

      const settings = await getSettings();
      expect(settings.SAFETY_SETTINGS).toEqual([
        { category: "TEST", threshold: "BLOCK" },
      ]);
    });

    it("should handle DB errors gracefully", async () => {
      const fromMock = vi
        .fn()
        .mockRejectedValue(new Error("DB connection failed"));
      mocks.select.mockReturnValue({ from: fromMock });

      const settings = await getSettings();
      // Should return defaults
      expect(settings.MAX_FAILURES).toBe(3);
    });
  });

  describe("updateSetting", () => {
    it("should call insert with onConflictDoUpdate", async () => {
      const onConflictDoUpdateMock = vi.fn();
      const valuesMock = vi.fn(() => ({
        onConflictDoUpdate: onConflictDoUpdateMock,
      }));
      mocks.insert.mockReturnValue({ values: valuesMock });

      await updateSetting("TEST_KEY", "TEST_VALUE");

      expect(mocks.insert).toHaveBeenCalledWith(settingsTable);
      expect(valuesMock).toHaveBeenCalledWith({
        key: "TEST_KEY",
        value: "TEST_VALUE",
      });
      expect(onConflictDoUpdateMock).toHaveBeenCalledWith({
        target: settingsTable.key,
        set: { value: "TEST_VALUE" },
      });
    });
  });
});
