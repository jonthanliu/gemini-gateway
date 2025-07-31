// src/lib/types/openai-types.ts

export interface OpenAIChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIChatMessage[];
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
