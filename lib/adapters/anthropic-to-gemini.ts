import type * as Anthropic from "@anthropic-ai/sdk/resources/messages";
import {
  FunctionDeclarationSchema,
  GenerateContentRequest,
  GenerateContentResult,
  Part,
  SchemaType,
} from "@google/generative-ai";

// --- Anthropic Response Types ---
interface AnthropicMessage {
  id: string;
  type: "message";
  role: "assistant";
  content: (
    | { type: "text"; text: string }
    | { type: "tool_use"; id: string; name: string; input: unknown }
  )[];
  model: string;
  stop_reason: "end_turn" | "tool_use" | "stop_sequence" | "max_tokens";
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// --- Helper Functions ---
function cleanSchema<T>(schema: T): T {
  if (typeof schema !== "object" || schema === null) return schema;
  if (Array.isArray(schema)) return schema.map(cleanSchema) as T;
  const newSchema: Record<string, unknown> = {};
  for (const key in schema) {
    if (Object.prototype.hasOwnProperty.call(schema, key)) {
      if (key !== "additionalProperties") {
        newSchema[key] = cleanSchema((schema as Record<string, unknown>)[key]);
      }
    }
  }
  if (newSchema.type === "string" && newSchema.format) {
    const allowedFormats = ["enum", "date-time"];
    if (!allowedFormats.includes(newSchema.format as string)) {
      delete newSchema.format;
    }
  }
  return newSchema as T;
}

// --- Standardized Adapter Functions ---
export function transformRequest(
  request: Anthropic.MessageCreateParams
): GenerateContentRequest {
  const geminiRequest: GenerateContentRequest = {
    contents: [],
    generationConfig: {},
    tools: [],
  };

  if (request.system) {
    const systemText = Array.isArray(request.system)
      ? request.system.map((s) => s.text).join("\n")
      : request.system;
    geminiRequest.systemInstruction = {
      role: "user",
      parts: [{ text: systemText }],
    };
  }

  geminiRequest.contents = request.messages.map((msg) => {
    const role = msg.role === "assistant" ? "model" : "user";
    const parts: Part[] = [];
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
        }
      }
    } else {
      parts.push({ text: msg.content });
    }
    return { role, parts };
  });

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

  if (request.max_tokens)
    geminiRequest.generationConfig!.maxOutputTokens = request.max_tokens;
  if (request.temperature)
    geminiRequest.generationConfig!.temperature = request.temperature;
  if (request.top_p) geminiRequest.generationConfig!.topP = request.top_p;
  if (request.top_k) geminiRequest.generationConfig!.topK = request.top_k;
  if (request.stop_sequences)
    geminiRequest.generationConfig!.stopSequences = request.stop_sequences;

  return geminiRequest;
}

export function transformResponse(
  geminiResult: GenerateContentResult,
  model: string
): AnthropicMessage {
  const content: AnthropicMessage["content"] = [];
  const geminiParts =
    geminiResult.response.candidates?.[0]?.content?.parts || [];

  for (const part of geminiParts) {
    if (part.text) {
      content.push({ type: "text", text: part.text });
    } else if (part.functionCall) {
      content.push({
        type: "tool_use",
        id: part.functionCall.name,
        name: part.functionCall.name,
        input: part.functionCall.args,
      });
    }
  }

  return {
    id: `msg-${Date.now()}`,
    type: "message",
    role: "assistant",
    content: content,
    model: model,
    stop_reason: "end_turn",
    usage: {
      input_tokens: geminiResult.response.usageMetadata?.promptTokenCount || 0,
      output_tokens:
        geminiResult.response.usageMetadata?.candidatesTokenCount || 0,
    },
  };
}

export async function* transformStream(
  geminiStream: AsyncGenerator<GenerateContentResult>
): AsyncGenerator<string> {
  for await (const geminiChunk of geminiStream) {
    const text =
      geminiChunk.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (text) {
      const anthropicChunk = {
        type: "content_block_delta",
        index: 0,
        delta: {
          type: "text_delta",
          text: text,
        },
      };
      yield `data: ${JSON.stringify(anthropicChunk)}\n\n`;
    }
  }
}
