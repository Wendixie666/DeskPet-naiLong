export type AiMessageRole = "system" | "user" | "assistant";

export interface AiMessage {
  role: AiMessageRole;
  content: string;
}

export interface ChatRequest {
  messages: AiMessage[];
  signal?: AbortSignal;
}

export interface AiProvider {
  chat(request: ChatRequest): AsyncIterable<string>;
}
