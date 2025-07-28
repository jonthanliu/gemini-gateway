import type * as Anthropic from "@anthropic-ai/sdk/resources/messages";
import type * as Gemini from "@google/generative-ai";
import {
  SchemaType,
  type FunctionDeclarationSchema,
} from "@google/generative-ai";

/**
 * Recursively removes the 'additionalProperties' key from a JSON schema object.
 * Gemini API rejects schemas that contain this key.
 * @param schema The schema object to clean.
 * @returns A new schema object without 'additionalProperties'.
 */
function cleanSchema<T>(schema: T): T {
  if (typeof schema !== "object" || schema === null) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map(cleanSchema) as T;
  }

  const newSchema: Record<string, unknown> = {};
  for (const key in schema) {
    if (Object.prototype.hasOwnProperty.call(schema, key)) {
      if (key !== "additionalProperties") {
        newSchema[key] = cleanSchema((schema as Record<string, unknown>)[key]);
      }
    }
  }

  // Gemini only supports 'enum' and 'date-time' for string formats.
  // Remove any other format specifiers to avoid validation errors.
  if (newSchema.type === "string" && newSchema.format) {
    const allowedFormats = ["enum", "date-time"];
    if (!allowedFormats.includes(newSchema.format as string)) {
      delete newSchema.format;
    }
  }

  return newSchema as T;
}

/**
 * Converts an Anthropic MessageCreateParams object to a Gemini GenerateContentRequest object.
 *
 * @param request The Anthropic request object.
 * @returns The converted Gemini request object.
 */
export function convertAnthropicToGemini(
  request: Anthropic.MessageCreateParams
): Gemini.GenerateContentRequest {
  const geminiRequest: Gemini.GenerateContentRequest = {
    contents: [],
    generationConfig: {},
    tools: [],
  };

  // System Prompt
  if (request.system) {
    const systemText = Array.isArray(request.system)
      ? request.system.map((s) => s.text).join("\n")
      : request.system;
    geminiRequest.systemInstruction = {
      role: "user",
      parts: [{ text: systemText }],
    };
  }

  // Messages
  geminiRequest.contents = request.messages.map((msg) => {
    const role = msg.role === "assistant" ? "model" : "user";
    const parts: Gemini.Part[] = [];

    if (Array.isArray(msg.content)) {
      for (const contentBlock of msg.content) {
        switch (contentBlock.type) {
          case "text":
            parts.push({ text: contentBlock.text });
            break;
          case "image":
            if (contentBlock.source.type === "base64") {
              parts.push({
                inlineData: {
                  mimeType: contentBlock.source.media_type,
                  data: contentBlock.source.data,
                },
              });
            }
            break;
          case "tool_result":
            parts.push({
              functionResponse: {
                name: contentBlock.tool_use_id,
                response: {
                  name: contentBlock.tool_use_id,
                  content: contentBlock.content,
                },
              },
            });
            break;
          case "tool_use":
            parts.push({
              functionCall: {
                name: contentBlock.name,
                args: contentBlock.input as { [key: string]: unknown },
              },
            });
            break;
        }
      }
    } else {
      parts.push({ text: msg.content });
    }

    return { role, parts };
  });

  // Tools
  if (request.tools) {
    const functionDeclarations = request.tools
      .filter((tool): tool is Anthropic.Tool => "input_schema" in tool)
      .map((tool) => {
        const cleanedProperties = cleanSchema(tool.input_schema.properties);

        return {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: SchemaType.OBJECT,
            properties: cleanedProperties,
            required: tool.input_schema.required,
          } as FunctionDeclarationSchema,
        };
      });

    if (functionDeclarations.length > 0) {
      geminiRequest.tools = [{ functionDeclarations }];
    }
  }

  // Generation Config
  if (request.max_tokens) {
    geminiRequest.generationConfig!.maxOutputTokens = request.max_tokens;
  }
  if (request.temperature) {
    geminiRequest.generationConfig!.temperature = request.temperature;
  }
  if (request.top_p) {
    geminiRequest.generationConfig!.topP = request.top_p;
  }
  if (request.top_k) {
    geminiRequest.generationConfig!.topK = request.top_k;
  }
  if (request.stop_sequences) {
    geminiRequest.generationConfig!.stopSequences = request.stop_sequences;
  }

  return geminiRequest;
}
