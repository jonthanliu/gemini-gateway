import {
  Content,
  FunctionDeclarationSchema,
  GenerateContentRequest,
  GenerateContentResult,
  Part,
} from "@google/generative-ai";
import {
  OpenAIChatCompletion,
  OpenAIChatCompletionRequest,
  OpenAIChatMessage,
  OpenAICompletionChoice,
  OpenAIUsage,
} from "../types/openai-types";

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
    const functionCalls = tool_calls.map((toolCall) => ({
      functionCall: {
        name: toolCall.function.name,
        args: JSON.parse(toolCall.function.arguments),
      },
    }));
    parts.push(...functionCalls);
  }

  return {
    role: geminiRole,
    parts,
  };
}

export function transformRequest(
  openaiRequest: OpenAIChatCompletionRequest
): GenerateContentRequest {
  const geminiContents: Content[] = openaiRequest.messages.map(
    openAIMessageToGeminiContent
  );

  const geminiRequest: GenerateContentRequest = {
    contents: geminiContents,
  };

  if (openaiRequest.temperature)
    geminiRequest.generationConfig = {
      ...geminiRequest.generationConfig,
      temperature: openaiRequest.temperature,
    };
  if (openaiRequest.top_p)
    geminiRequest.generationConfig = {
      ...geminiRequest.generationConfig,
      topP: openaiRequest.top_p,
    };
  if (openaiRequest.max_tokens)
    geminiRequest.generationConfig = {
      ...geminiRequest.generationConfig,
      maxOutputTokens: openaiRequest.max_tokens,
    };
  if (openaiRequest.stop) {
    geminiRequest.generationConfig = {
      ...geminiRequest.generationConfig,
      stopSequences: Array.isArray(openaiRequest.stop)
        ? openaiRequest.stop
        : [openaiRequest.stop],
    };
  }

  if (openaiRequest.tools) {
    geminiRequest.tools = openaiRequest.tools.map((tool) => ({
      functionDeclarations: [
        {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters as FunctionDeclarationSchema, // 强制转换为 FunctionDeclarationSchema
        },
      ],
    }));
  }

  return geminiRequest;
}

export function transformResponse(
  geminiResult: GenerateContentResult,
  model: string
): OpenAIChatCompletion {
  const firstCandidate = geminiResult.response.candidates?.[0];
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
          name: firstPart.functionCall.name,
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
    prompt_tokens: geminiResult.response.usageMetadata?.promptTokenCount || 0,
    completion_tokens:
      geminiResult.response.usageMetadata?.candidatesTokenCount || 0,
    total_tokens: geminiResult.response.usageMetadata?.totalTokenCount || 0,
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
  geminiStream: AsyncGenerator<GenerateContentResult>,
  model: string
): AsyncGenerator<string> {
  for await (const geminiChunk of geminiStream) {
    const firstCandidate = geminiChunk.response.candidates?.[0];
    const firstPart = firstCandidate?.content?.parts?.[0];

    const delta: Partial<OpenAIChatMessage> & {
      tool_calls?: OpenAIToolCallDelta[];
    } = {};
    if (firstPart?.text) {
      delta.content = firstPart.text;
    }
    if (firstPart?.functionCall) {
      delta.tool_calls = [
        {
          index: 0,
          id: `call_${Date.now()}`,
          type: "function",
          function: {
            name: firstPart.functionCall.name,
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
