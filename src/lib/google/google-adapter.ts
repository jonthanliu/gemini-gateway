// src/lib/google-adapter.ts

import { getSettings } from "@/lib/config/settings";
import type { Content, Part } from "@google/generative-ai";

interface GeminiTool {
  functionDeclarations?: Record<string, unknown>[];
  codeExecution?: object;
  googleSearch?: object;
}

interface GeminiRequestBody {
  contents: Content[];
  tools?: GeminiTool[];
  generationConfig?: Record<string, unknown>;
  systemInstruction?: Record<string, unknown>;
}

// Based on the Python implementation, this function cleans the JSON schema
// properties that are not supported by the Gemini API.
function cleanJsonSchemaProperties<T>(obj: T): T {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  const unsupportedFields = new Set([
    "exclusiveMaximum",
    "exclusiveMinimum",
    "const",
    "examples",
    "contentEncoding",
    "contentMediaType",
    "if",
    "then",
    "else",
    "allOf",
    "anyOf",
    "oneOf",
    "not",
    "definitions",
    "$schema",
    "$id",
    "$ref",
    "$comment",
    "readOnly",
    "writeOnly",
  ]);

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanJsonSchemaProperties(item)) as T;
  }

  const cleaned: Partial<T> = {};
  for (const key in obj) {
    if (!unsupportedFields.has(key)) {
      cleaned[key] = cleanJsonSchemaProperties(obj[key]);
    }
  }
  return cleaned as T;
}

// Builds the 'tools' array based on the model and request payload.
async function buildTools(
  model: string,
  payload: GeminiRequestBody
): Promise<GeminiTool[]> {
  const settings = await getSettings();
  const tool: GeminiTool = {};

  if (payload && typeof payload === "object" && payload.tools) {
    const tools = Array.isArray(payload.tools)
      ? payload.tools
      : [payload.tools];
    const functionDeclarations = tools
      .flatMap((t: GeminiTool) => t.functionDeclarations || [])
      .map(cleanJsonSchemaProperties);
    if (functionDeclarations.length > 0) {
      tool.functionDeclarations = functionDeclarations;
    }
  }

  const hasImage = payload.contents?.some((c: Content) =>
    c.parts?.some(
      (p: Part) => (p as { inlineData: unknown }).inlineData || false
    )
  );

  if (
    settings.TOOLS_CODE_EXECUTION_ENABLED &&
    !model.endsWith("-search") &&
    !model.includes("-thinking") &&
    !hasImage
  ) {
    tool.codeExecution = {};
  }

  if (model.endsWith("-search")) {
    tool.googleSearch = {};
  }

  if (tool.functionDeclarations) {
    delete tool.googleSearch;
    delete tool.codeExecution;
  }

  return tool && Object.keys(tool).length > 0 ? [tool] : [];
}

// Filters out contents with empty or invalid parts.
function filterEmptyParts(contents: Content[]): Content[] {
  if (!contents) return [];
  return contents
    .map((content: Content) => {
      if (!content || !Array.isArray(content.parts)) return null;
      const validParts = content.parts.filter(
        (part: Part) =>
          part && typeof part === "object" && Object.keys(part).length > 0
      );
      if (validParts.length === 0) return null;
      return { ...content, parts: validParts };
    })
    .filter(Boolean) as Content[];
}

// Gets safety settings based on the model.
async function getSafetySettings(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _model: string
): Promise<Record<string, unknown>[]> {
  const settings = await getSettings();
  // In the future, we might have model-specific settings like 'gemini-2.0-flash-exp'
  return (settings.SAFETY_SETTINGS as Record<string, unknown>[]) || [];
}

// Main function to build the final payload for the Gemini API.
export async function buildGeminiRequest(
  model: string,
  requestBody: GeminiRequestBody
): Promise<Record<string, unknown>> {
  const settings = await getSettings();
  const filteredContents = filterEmptyParts(requestBody.contents);
  const tools = await buildTools(model, requestBody);
  const safetySettings = await getSafetySettings(model);

  const generationConfig = requestBody.generationConfig || {};
  if (generationConfig.maxOutputTokens === null) {
    delete (generationConfig as Record<string, unknown>).maxOutputTokens;
  }

  // Handle thinkingConfig
  if (
    (generationConfig as Record<string, unknown>).thinkingConfig === undefined
  ) {
    if (model.endsWith("-non-thinking")) {
      (generationConfig as Record<string, unknown>).thinkingConfig = {
        thinkingBudget: 0,
      };
    } else if (
      settings.THINKING_BUDGET_MAP &&
      (settings.THINKING_BUDGET_MAP as Record<string, number>)[model]
    ) {
      (generationConfig as Record<string, unknown>).thinkingConfig = {
        thinkingBudget: (
          settings.THINKING_BUDGET_MAP as Record<string, number>
        )[model],
      };
    }
  }

  const payload = {
    contents: filteredContents,
    tools,
    safetySettings,
    generationConfig,
    systemInstruction: requestBody.systemInstruction,
  };

  if (model.endsWith("-image") || model.endsWith("-image-generation")) {
    delete (payload as Record<string, unknown>).systemInstruction;
    (payload.generationConfig as Record<string, unknown>).responseModalities = [
      "Text",
      "Image",
    ];
  }

  return payload;
}

export function formatGoogleModelsToOpenAI(
  googleModels: Record<string, { name: string }[]>
): Record<string, unknown> {
  if (!googleModels || !Array.isArray(googleModels.models)) {
    return { object: "list", data: [] };
  }

  return {
    object: "list",
    data: googleModels.models.map((model: { name: string }) => ({
      id: model.name.replace("models/", ""),
      object: "model",
      created: Date.now(),
      owned_by: "google",
    })),
  };
}

// --- OpenAI Compatibility Functions ---

// Define the structure for OpenAI chat messages and requests
export interface OpenAIChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OpenAIChatRequest {
  messages: OpenAIChatMessage[];
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string | string[];
  stream?: boolean;
}

/**
 * Converts an array of OpenAI-formatted messages to the Gemini 'contents' format.
 * @param messages - An array of OpenAIChatMessage objects.
 * @returns An array of Gemini-formatted content objects.
 */
export function openAiToGeminiRequest(
  messages: OpenAIChatMessage[]
): Content[] {
  // Gemini API uses 'model' for the assistant's role.
  // We'll map 'assistant' to 'model' and 'user'/'system' to 'user'.
  const contents: Content[] = messages.map((msg) => {
    return {
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    };
  });
  return contents;
}

/**
 * Transforms a single Gemini API response chunk into an OpenAI-compatible stream chunk.
 * @param geminiChunk - The chunk from the Gemini API response.
 * @param model - The model name to include in the OpenAI chunk.
 * @returns A string formatted as a Server-Sent Event for the OpenAI stream.
 */
export function geminiToOpenAiStreamChunk(
  geminiChunk: {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
    }[];
  },
  model: string
): string {
  const text = geminiChunk.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // OpenAI stream chunks have a specific format.
  const openAIChunk = {
    id: `chatcmpl-${Date.now()}`, // Create a unique ID for the chunk
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [
      {
        index: 0,
        delta: {
          content: text,
        },
        finish_reason: geminiChunk.candidates?.[0]?.finishReason || null,
      },
    ],
  };

  // Format as a Server-Sent Event (SSE)
  return `data: ${JSON.stringify(openAIChunk)}\n\n`;
}
