
"use server";

import { ParsedSettings } from "@/lib/config/settings";
import { hashToken } from "@/lib/crypto";
import { db } from "@/lib/db";
import { settings as settingsTable } from "@/lib/db/schema";
import logger from "@/lib/logger";

/**
 * Updates multiple application settings in the database.
 * @param settings - An object containing the settings to update.
 */
export async function updateSettings(settings: ParsedSettings) {
  try {
    const settingsToUpdate: Partial<ParsedSettings> = { ...settings };

    if (settings.AUTH_TOKEN) {
      settingsToUpdate.AUTH_TOKEN = await hashToken(settings.AUTH_TOKEN);
    } else {
      delete settingsToUpdate.AUTH_TOKEN;
    }

    const updates = Object.entries(settingsToUpdate).map(([key, value]) => {
      let dbValue: string;
      if (typeof value === "boolean" || typeof value === "number") {
        dbValue = value.toString();
      } else if (typeof value === "object") {
        dbValue = JSON.stringify(value);
      } else {
        dbValue = value as string;
      }
      return db
        .insert(settingsTable)
        .values({ key, value: dbValue })
        .onConflictDoUpdate({
          target: settingsTable.key,
          set: { value: dbValue },
        });
    });

    await Promise.all(updates);
    logger.info("Successfully updated settings in the database.");
  } catch (error) {
    logger.error({ error }, "Failed to update settings in the database.");
    throw new Error("Failed to update settings.");
  }
}
