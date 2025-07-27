
"use server";

import { ParsedSettings, resetSettings } from "@/lib/config/settings";
import { updateSettings } from "@/lib/services/config.service";
import { revalidatePath } from "next/cache";

/**
 * Server Action to update multiple application settings.
 * This is a thin wrapper around the `updateSettings` service function.
 */
export async function updateSettingsAction(settings: ParsedSettings): Promise<{
  success?: string;
  error?: string;
}> {
  try {
    await updateSettings(settings);

    // Reset the in-memory settings cache to apply changes immediately.
    resetSettings();
    
    // Architectural Decision on `revalidatePath`:
    // While revalidating a specific path creates a coupling between the action and the UI,
    // it is the recommended Next.js pattern for ensuring data freshness after a mutation.
    // The alternative (revalidating the entire site) is less performant.
    // We accept this coupling as a pragmatic trade-off for a better user experience.
    revalidatePath("/admin/config");

    return { success: "Settings updated successfully." };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return { error: `Failed to update settings: ${errorMessage}` };
  }
}
