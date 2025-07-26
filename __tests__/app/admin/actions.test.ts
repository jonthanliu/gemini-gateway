import { addApiKeys, updateSettings } from "@/app/[lang]/admin/actions";
import type { ParsedSettings } from "@/lib/config/settings";
import * as settingsService from "@/lib/config/settings";
import * as crypto from "@/lib/crypto";
import { apiKeys, settings as settingsTable } from "@/lib/db/schema";
import * as cache from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/get-dictionary", () => ({
  getDictionary: vi.fn().mockResolvedValue({
    keys: {
      addDialog: {
        success: { added: "{count} keys added." },
        error: { failedToAdd: "Failed to add keys." },
        info: { duplicates: "{count} duplicates found." },
      },
    },
    config: { form: { success: { updated: "Settings updated." } } },
  }),
}));
vi.mock("@/lib/get-locale", () => ({
  getLocale: vi.fn().mockResolvedValue("en"),
}));
vi.mock("@/lib/services/key.service");
vi.mock("@/lib/config/settings");
vi.mock("next/cache");
vi.mock("@/lib/crypto");
vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Map()),
}));

const mocks = vi.hoisted(() => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
    },
  };
});

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

describe("Admin Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.select.mockClear();
    mocks.db.insert.mockClear();
  });

  describe("addApiKeys", () => {
    it("should add new, unique API keys", async () => {
      const existingKeys = [{ key: "key1" }];
      const whereMock = vi.fn().mockResolvedValue(existingKeys);
      const fromMock = vi.fn(() => ({ where: whereMock }));
      mocks.db.select.mockReturnValue({ from: fromMock });

      const insertValuesMock = vi.fn();
      mocks.db.insert.mockReturnValue({ values: insertValuesMock });

      const result = await addApiKeys("key1, key2, key3, key2");

      expect(mocks.db.select).toHaveBeenCalledWith({ key: apiKeys.key });
      expect(insertValuesMock).toHaveBeenCalledWith([
        { key: "key2" },
        { key: "key3" },
      ]);
      expect(result.success).toBe(
        "2 new key(s) added. 1 key(s) were duplicates or already existed."
      );
      expect(cache.revalidatePath).toHaveBeenCalledWith("/admin");
    });
  });

  describe("updateSettings", () => {
    it("should update settings and hash the auth token", async () => {
      vi.spyOn(crypto, "hashToken").mockResolvedValue("hashed_token");

      const onConflictMock = vi.fn();
      const valuesMock = vi.fn(() => ({ onConflictDoUpdate: onConflictMock }));
      mocks.db.insert.mockReturnValue({ values: valuesMock });

      const settingsToUpdate = {
        AUTH_TOKEN: "new_token",
        MAX_FAILURES: 5,
        TOOLS_CODE_EXECUTION_ENABLED: true,
      };

      const result = await updateSettings(settingsToUpdate as ParsedSettings);

      expect(crypto.hashToken).toHaveBeenCalledWith("new_token");
      expect(mocks.db.insert).toHaveBeenCalledWith(settingsTable);
      expect(valuesMock).toHaveBeenCalledTimes(3);
      expect(valuesMock).toHaveBeenCalledWith({
        key: "AUTH_TOKEN",
        value: "hashed_token",
      });
      expect(valuesMock).toHaveBeenCalledWith({
        key: "MAX_FAILURES",
        value: "5",
      });
      expect(valuesMock).toHaveBeenCalledWith({
        key: "TOOLS_CODE_EXECUTION_ENABLED",
        value: "true",
      });
      expect(result.success).toBe("Configuration updated successfully!");
      expect(settingsService.resetSettings).toHaveBeenCalled();
      expect(cache.revalidatePath).toHaveBeenCalledWith("/admin/config");
    });
  });
});
