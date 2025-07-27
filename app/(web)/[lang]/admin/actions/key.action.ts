"use server";

import {
  addApiKeys,
  deleteApiKeys,
  getDetailedApiCallStats,
  getDetailedKeyStats,
  getKeyUsageDetails,
} from "@/lib/services/key.service";
import { revalidatePath } from "next/cache";

export type KeyFormState = {
  success: boolean;
  message: string;
};

export async function addApiKeysAction(
  prevState: KeyFormState,
  formData: FormData
): Promise<KeyFormState> {
  const keysInput = formData.get("keys");
  if (!keysInput || typeof keysInput !== "string") {
    return { success: false, message: "API keys are required." };
  }

  const keys = keysInput
    .split(/[\n,]+/)
    .map((key) => key.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    return {
      success: false,
      message: "Please provide at least one valid API key.",
    };
  }

  try {
    const { added, duplicates } = await addApiKeys(keys);

    let message = "";
    if (added > 0) {
      message += `Successfully added ${added} new key(s). `;
    }
    if (duplicates > 0) {
      message += `${duplicates} key(s) were duplicates and have been skipped.`;
    }
    if (added === 0 && duplicates > 0) {
      message = "All submitted keys already exist. No new keys were added.";
    }
    if (added === 0 && duplicates === 0 && keys.length > 0) {
      message = "No valid keys were found to add.";
    }

    if (added > 0) {
      revalidatePath("/admin");
    }

    return {
      success: true,
      message: message.trim(),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return {
      success: false,
      message: `An error occurred: ${errorMessage}`,
    };
  }
}

export async function deleteApiKeysAction(keys: string[]) {
  if (!keys || keys.length === 0) {
    return { success: false, error: "No keys provided for deletion." };
  }
  try {
    const deleteResponse = await deleteApiKeys(keys);
    revalidatePath("/admin");
    return {
      success: true,
      message: `Successfully deleted ${deleteResponse.length} key(s).`,
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: `Failed to delete keys: ${errorMessage}` };
  }
}

export type KeyUsageDetails = Awaited<ReturnType<typeof getKeyUsageDetails>>;

export async function getKeyUsageDetailsAction(apiKey: string): Promise<{
  data?: KeyUsageDetails;
  error?: string;
}> {
  try {
    const data = await getKeyUsageDetails(apiKey);
    return { data };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return { error: `Failed to fetch key usage details: ${errorMessage}` };
  }
}

export type DetailedKeyStats = Awaited<ReturnType<typeof getDetailedKeyStats>>;

export async function getDetailedKeyStatsAction(): Promise<{
  data?: DetailedKeyStats;
  error?: string;
}> {
  try {
    const data = await getDetailedKeyStats();
    return { data };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return { error: `Failed to fetch detailed key stats: ${errorMessage}` };
  }
}

type TimeFrame = "1m" | "1h" | "24h";
export type DetailedApiCallStats = Awaited<
  ReturnType<typeof getDetailedApiCallStats>
>;

export async function getDetailedApiCallStatsAction(
  timeframe: TimeFrame
): Promise<{
  data?: DetailedApiCallStats;
  error?: string;
}> {
  try {
    const data = await getDetailedApiCallStats(timeframe);
    return { data };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return {
      error: `Failed to fetch detailed API call stats: ${errorMessage}`,
    };
  }
}
