// src/lib/types/openai-types.ts

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: object;
  };
}

export interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
}

export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIChatMessage[];
  tools?: OpenAITool[];
  tool_choice?:
    | "auto"
    | "none"
    | { type: "function"; function: { name: string } };
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string | string[];
  stream?: boolean;
}

export interface OpenAICompletionChoice {
  index: number;
  message: OpenAIChatMessage;
  finish_reason: string | null;
}

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIChatCompletion {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: OpenAICompletionChoice[];
  usage: OpenAIUsage;
}
