"use server";

import {
  ModelMapping,
  modelMappingService,
} from "@/lib/services/model-mapping.service";
import { revalidatePath } from "next/cache";

export async function createMappingAction(
  data: Omit<ModelMapping, "id" | "createdAt" | "updatedAt">
) {
  try {
    await modelMappingService.create(data);
    revalidatePath("/admin/mappings");
    return { success: "Mapping created successfully." };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return { error: errorMessage };
  }
}

export async function updateMappingAction(
  id: number,
  data: Partial<Omit<ModelMapping, "id">>
) {
  try {
    await modelMappingService.update(id, data);
    revalidatePath("/admin/mappings");
    return { success: "Mapping updated successfully." };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return { error: errorMessage };
  }
}

export async function deleteMappingAction(id: number) {
  try {
    await modelMappingService.delete(id);
    revalidatePath("/admin/mappings");
    return { success: "Mapping deleted successfully." };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return { error: errorMessage };
  }
}
