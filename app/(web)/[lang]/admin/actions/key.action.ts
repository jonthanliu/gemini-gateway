"use server";

import { addApiKeys } from "@/lib/services/key.service";
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

  const keys = keysInput.split(/\\n|\\s/g).filter(Boolean);

  if (keys.length === 0) {
    return { success: false, message: "Please provide at least one API key." };
  }

  try {
    const result = await addApiKeys(keys);
    revalidatePath("/admin");
    return {
      success: true,
      message: `Successfully added ${result.length} new API key(s).`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return {
      success: false,
      message: errorMessage,
    };
  }
}
