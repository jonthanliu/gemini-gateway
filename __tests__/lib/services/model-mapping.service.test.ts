import { db } from "@/lib/db";
import {
  ModelMapping,
  modelMappingService,
} from "@/lib/services/model-mapping.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the db object
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      modelMappings: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  },
}));

const mockMappings: ModelMapping[] = [
  {
    id: 1,
    source_name: "gpt-4o",
    source_protocol: "openai",
    priority: 0,
    target_name: "gemini-pro",
    target_provider: "gemini",
    target_endpoint: "v1beta/models/gemini-pro:generateContent",
    capabilities: null,
    constraints: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    source_name: "gpt-4-*",
    source_protocol: "openai",
    priority: 10,
    target_name: "gemini-ultra",
    target_provider: "gemini",
    target_endpoint: "v1beta/models/gemini-ultra:generateContent",
    capabilities: null,
    constraints: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    source_name: "gpt-*-latest",
    source_protocol: "openai",
    priority: 5,
    target_name: "gemini-flash",
    target_provider: "gemini",
    target_endpoint: "v1beta/models/gemini-flash:generateContent",
    capabilities: null,
    constraints: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    source_name: "__DEFAULT__",
    source_protocol: "openai",
    priority: 0,
    target_name: "gemini-default",
    target_provider: "gemini",
    target_endpoint: "v1beta/models/gemini-default:generateContent",
    capabilities: null,
    constraints: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 5,
    source_name: "claude-3-opus",
    source_protocol: "anthropic",
    priority: 0,
    target_name: "gemini-pro",
    target_provider: "gemini",
    target_endpoint: "v1beta/models/gemini-pro:generateContent",
    capabilities: null,
    constraints: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("ModelMappingService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("findMapping", () => {
    it("should return an exact match if one exists", async () => {
      vi.mocked(db.query.modelMappings.findFirst).mockResolvedValue(
        mockMappings[0]
      );
      const result = await modelMappingService.findMapping("openai", "gpt-4o");
      expect(result).toEqual(mockMappings[0]);
      expect(db.query.modelMappings.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
      });
    });

    it("should return the highest priority template match if no exact match exists", async () => {
      vi.mocked(db.query.modelMappings.findFirst).mockResolvedValue(undefined);
      vi.mocked(db.query.modelMappings.findMany).mockResolvedValue([
        mockMappings[1],
        mockMappings[2],
      ]);
      const result = await modelMappingService.findMapping(
        "openai",
        "gpt-4-turbo"
      );
      expect(result).toEqual(mockMappings[1]);
    });

    it("should correctly match a template with the wildcard in the middle", async () => {
      vi.mocked(db.query.modelMappings.findFirst).mockResolvedValue(undefined);
      vi.mocked(db.query.modelMappings.findMany).mockResolvedValue([
        mockMappings[1],
        mockMappings[2],
      ]);
      const result = await modelMappingService.findMapping(
        "openai",
        "gpt-something-latest"
      );
      expect(result).toEqual(mockMappings[2]);
    });

    it("should return the default rule if no exact or template match is found", async () => {
      vi.mocked(db.query.modelMappings.findFirst)
        .mockResolvedValueOnce(undefined) // No exact match
        .mockResolvedValueOnce(mockMappings[3]); // Default match
      vi.mocked(db.query.modelMappings.findMany).mockResolvedValue([]); // No template matches
      const result = await modelMappingService.findMapping(
        "openai",
        "unconfigured-model"
      );
      expect(result).toEqual(mockMappings[3]);
    });

    it("should return null if no rules match", async () => {
      vi.mocked(db.query.modelMappings.findFirst).mockResolvedValue(undefined);
      vi.mocked(db.query.modelMappings.findMany).mockResolvedValue([]);
      const result = await modelMappingService.findMapping(
        "openai",
        "no-match-at-all"
      );
      expect(result).toBeNull();
    });

    it("should return the correct rule for a different protocol", async () => {
      vi.mocked(db.query.modelMappings.findFirst).mockResolvedValue(
        mockMappings[4]
      );
      const result = await modelMappingService.findMapping(
        "anthropic",
        "claude-3-opus"
      );
      expect(result).toEqual(mockMappings[4]);
      expect(db.query.modelMappings.findFirst).toHaveBeenCalled();
    });
  });
});
