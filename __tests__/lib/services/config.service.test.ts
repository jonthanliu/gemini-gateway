import { ParsedSettings } from "@/lib/config/settings";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { updateSettings } from "@/lib/services/config.service";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Config Service", () => {
  beforeEach(async () => {
    await db.delete(settings);
  });

  afterEach(async () => {
    await db.delete(settings);
  });

  it("should update settings in the database", async () => {
    const newSettings: ParsedSettings = {
      AUTH_TOKEN: "new_token",
      ALLOWED_TOKENS: "token1,token2",
      MAX_FAILURES: 5,
      HEALTH_CHECK_MODEL: "gemini-1.5-pro",
      PROXY_URL: "http://localhost:8080",
      TOOLS_CODE_EXECUTION_ENABLED: true,
      SAFETY_SETTINGS: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
      THINKING_BUDGET_MAP: { "gemini-1.5-pro": 1000 },
    };

    await updateSettings(newSettings);

    const authToken = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "AUTH_TOKEN"));
    expect(authToken[0].value).not.toBe("new_token"); // Should be hashed

    const maxFailures = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "MAX_FAILURES"));
    expect(maxFailures[0].value).toBe("5");
  });
});
