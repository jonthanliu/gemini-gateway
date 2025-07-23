import type * as Anthropic from "@anthropic-ai/sdk/resources/messages";
import type * as Gemini from "@google/generative-ai";
import {
  SchemaType,
  type FunctionDeclarationSchema,
} from "@google/generative-ai";

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
      role: "system",
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
        return {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: SchemaType.OBJECT,
            properties: tool.input_schema.properties,
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
