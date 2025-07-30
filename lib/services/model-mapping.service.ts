// lib/services/model-mapping.service.ts
import { db } from "@/lib/db";
import { modelMappings } from "@/lib/db/schema";
import { and, desc, eq, like, notLike } from "drizzle-orm";

// Define a type for a mapping rule
export type ModelMapping = typeof modelMappings.$inferSelect;
export type Protocol = ModelMapping["source_protocol"];

class ModelMappingService {
  /**
   * The core routing logic. Finds the best mapping rule for a given request.
   */
  async findMapping(
    protocol: Protocol,
    modelName: string
  ): Promise<ModelMapping | null> {
    // 1. Exact Match First
    const exactMatch = await db.query.modelMappings.findFirst({
      where: and(
        eq(modelMappings.source_protocol, protocol),
        eq(modelMappings.source_name, modelName),
        notLike(modelMappings.source_name, "%*%") // Ensure it's not a template
      ),
    });
    if (exactMatch) return exactMatch;

    // 2. Template Match if no exact match is found
    const templateRules = await db.query.modelMappings.findMany({
      where: and(
        eq(modelMappings.source_protocol, protocol),
        like(modelMappings.source_name, "%*%")
      ),
      orderBy: [desc(modelMappings.priority)], // Highest priority first
    });

    for (const rule of templateRules) {
      const regex = new RegExp(
        "^" + rule.source_name.replace(/\*/g, ".*") + "$"
      );
      if (regex.test(modelName)) {
        return rule; // Return first matching template
      }
    }

    // 3. Fallback to Default if no other rule matches
    const defaultRule = await db.query.modelMappings.findFirst({
      where: and(
        eq(modelMappings.source_protocol, protocol),
        eq(modelMappings.source_name, "__DEFAULT__")
      ),
    });
    return defaultRule || null;
  }

  /**
   * Lists all configured source models for the /v1/models endpoint.
   */
  async listAvailableModels(
    protocol: Protocol
  ): Promise<Pick<ModelMapping, "source_name">[]> {
    return db
      .select({ source_name: modelMappings.source_name })
      .from(modelMappings)
      .where(eq(modelMappings.source_protocol, protocol));
  }

  // Standard CRUD operations to be called by Server Actions
  async list() {
    return db.query.modelMappings.findMany({
      orderBy: [
        desc(modelMappings.source_protocol),
        desc(modelMappings.priority),
      ],
    });
  }
  async create(data: Omit<ModelMapping, "id" | "createdAt" | "updatedAt">) {
    /* ... */
  }
  async update(id: number, data: Partial<Omit<ModelMapping, "id">>) {
    /* ... */
  }
  async delete(id: number) {
    /* ... */
  }
}

export const modelMappingService = new ModelMappingService();
