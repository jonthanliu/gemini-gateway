import type {
  Content,
  FunctionCall,
  GenerateContentParameters,
  GenerateContentResponse,
  GenerationConfig,
  Part,
  Tool,
} from "@google/genai";
import {
  OpenAIChatCompletion,
  OpenAIChatCompletionRequest,
  OpenAIChatMessage,
  OpenAICompletionChoice,
  OpenAIUsage,
} from "../types/openai-types";

// Local interface to extend GenerationConfig for type safety
interface ExtendedGenerationConfig extends GenerationConfig {
  tools?: Tool[];
}

// OpenAI's streaming delta for tool calls has a unique structure.
interface OpenAIToolCallDelta {
  index: number;
  id?: string;
  type?: "function";
  function?: {
    name?: string;
    arguments?: string;
  };
}

const roleMap: Record<string, string> = {
  user: "user",
  assistant: "model",
  system: "user",
  tool: "function",
};

function openAIMessageToGeminiContent(message: OpenAIChatMessage): Content {
  const { role, content, tool_calls } = message;
  const geminiRole = roleMap[role] || "user";
  const parts: Part[] = [];

  if (content) {
    parts.push({ text: content });
  }

  if (tool_calls) {
    const functionCalls: FunctionCall[] = tool_calls.map((toolCall) => ({
      name: toolCall.function.name,
      args: JSON.parse(toolCall.function.arguments),
    }));
    parts.push(...functionCalls.map((fc) => ({ functionCall: fc })));
  }

  return {
    role: geminiRole,
    parts,
  };
}

export function transformRequest(
  model: string,
  openaiRequest: OpenAIChatCompletionRequest
): GenerateContentParameters {
  const geminiContents: Content[] = openaiRequest.messages.map(
    openAIMessageToGeminiContent
  );

  const generationConfig: ExtendedGenerationConfig = {};
  if (openaiRequest.temperature)
    generationConfig.temperature = openaiRequest.temperature;
  if (openaiRequest.top_p) generationConfig.topP = openaiRequest.top_p;
  if (openaiRequest.max_tokens)
    generationConfig.maxOutputTokens = openaiRequest.max_tokens;
  if (openaiRequest.stop) {
    if (Array.isArray(openaiRequest.stop)) {
      generationConfig.stopSequences = openaiRequest.stop;
    } else {
      generationConfig.stopSequences = [openaiRequest.stop];
    }
  }

  if (openaiRequest.tools) {
    generationConfig.tools = [
      {
        functionDeclarations: openaiRequest.tools.map((t) => t.function),
      },
    ];
  }

  return {
    model,
    contents: geminiContents,
    config: generationConfig,
  };
}

export function transformResponse(
  geminiResult: GenerateContentResponse,
  model: string
): OpenAIChatCompletion {
  const firstCandidate = geminiResult.candidates?.[0];
  const firstPart = firstCandidate?.content?.parts?.[0];

  const message: OpenAIChatMessage = { role: "assistant", content: null };

  if (firstPart?.text) {
    message.content = firstPart.text;
  }

  if (firstPart?.functionCall) {
    message.tool_calls = [
      {
        id: `call_${Date.now()}`,
        type: "function",
        function: {
          name: firstPart.functionCall.name ?? "",
          arguments: JSON.stringify(firstPart.functionCall.args),
        },
      },
    ];
  }

  const choice: OpenAICompletionChoice = {
    index: 0,
    message: message,
    finish_reason: firstCandidate?.finishReason || "stop",
  };

  const usage: OpenAIUsage = {
    prompt_tokens: geminiResult.usageMetadata?.promptTokenCount || 0,
    completion_tokens: geminiResult.usageMetadata?.candidatesTokenCount || 0,
    total_tokens: geminiResult.usageMetadata?.totalTokenCount || 0,
  };

  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [choice],
    usage: usage,
  };
}

export async function* transformStream(
  geminiStream: AsyncGenerator<GenerateContentResponse>,
  model: string
): AsyncGenerator<string> {
  for await (const geminiChunk of geminiStream) {
    const firstCandidate = geminiChunk.candidates?.[0];
    const firstPart = firstCandidate?.content?.parts?.[0];

    const delta: Partial<OpenAIChatMessage> & {
      tool_calls?: OpenAIToolCallDelta[];
    } = {};
    if (firstPart?.text) {
      delta.content = firstPart.text;
    }
    if (firstPart?.functionCall) {
      // Note: The streaming format for tool calls in OpenAI is an array.
      // We construct it to match the expected client-side structure.
      delta.tool_calls = [
        {
          index: 0,
          id: `call_${Date.now()}`, // A temporary ID for the call
          type: "function",
          function: {
            name: firstPart.functionCall.name ?? "",
            arguments: JSON.stringify(firstPart.functionCall.args),
          },
        },
      ];
    }

    const openAIChunk = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          delta: delta,
          finish_reason: firstCandidate?.finishReason || null,
        },
      ],
    };
    yield `data: ${JSON.stringify(openAIChunk)}\n\n`;
  }
}
