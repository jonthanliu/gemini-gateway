import { db } from "@/lib/db";
import { settings as settingsTable } from "@/lib/db/schema";
import {
  unstable_getSettings as getSettings,
  updateSetting,
  resetSettings,
  defaultSettings,
} from "@/lib/config/settings";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

describe("Settings Service", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.clearAllMocks();
    await db.delete(settingsTable);
    resetSettings();
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    vi.clearAllMocks();
    process.env = originalEnv;
    await db.delete(settingsTable);
    resetSettings();
  });

  describe("getSettings", () => {
    it("should return default settings if DB and env are empty", async () => {
      const settings = await getSettings();
      expect(settings.MAX_FAILURES).toBe(parseInt(defaultSettings.MAX_FAILURES));
      expect(settings.TOOLS_CODE_EXECUTION_ENABLED).toBe(false);
    });

    it("should prioritize environment variables over defaults", async () => {
      process.env.MAX_FAILURES = "10";
      process.env.TOOLS_CODE_EXECUTION_ENABLED = "true";

      const settings = await getSettings();
      expect(settings.MAX_FAILURES).toBe(10);
      expect(settings.TOOLS_CODE_EXECUTION_ENABLED).toBe(true);
    });

    it("should prioritize database values over env and defaults", async () => {
      process.env.MAX_FAILURES = "5";
      await updateSetting("MAX_FAILURES", "15");

      const settings = await getSettings();
      expect(settings.MAX_FAILURES).toBe(15);
    });
  });

  describe("updateSetting", () => {
    it("should insert a new setting if it does not exist", async () => {
      await updateSetting("TEST_KEY", "TEST_VALUE");
      const result = await db
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.key, "TEST_KEY"));
      expect(result[0].value).toBe("TEST_VALUE");
    });

    it("should update an existing setting", async () => {
      await db
        .insert(settingsTable)
        .values({ key: "TEST_KEY", value: "OLD_VALUE" });
      
      await updateSetting("TEST_KEY", "NEW_VALUE");

      const result = await db
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.key, "TEST_KEY"));
        
      expect(result.length).toBe(1);
      expect(result[0].value).toBe("NEW_VALUE");
    });
  });
});
