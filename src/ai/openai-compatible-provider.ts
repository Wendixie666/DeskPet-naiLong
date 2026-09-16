import type { AiConfig } from "../shared/types.ts";
import type { AiProvider, ChatRequest } from "./ai-provider.ts";

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

function connectionError(status: number): string {
  if (status === 400) {
    return "模型不存在或请求参数错误";
  }
  if (status === 401) {
    return "API Key 无效";
  }
  if (status === 403) {
    return "API Key 无效或没有权限";
  }
  if (status === 404) {
    return "Base URL 或接口路径错误";
  }
  if (status === 429) {
    return "请求过于频繁，请稍后再试";
  }
  if (status >= 500) {
    return "AI 服务暂时不可用，请稍后再试";
  }
  return `请求失败（HTTP ${status}）`;
}

function parseDelta(line: string): string | undefined {
  if (!line.startsWith("data:")) {
    return undefined;
  }
  const data = line.slice(5).trim();
  if (data === "[DONE]") {
    return undefined;
  }
  try {
    const payload = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: unknown } }>;
    };
    const content = payload.choices?.[0]?.delta?.content;
    return typeof content === "string" ? content : undefined;
  } catch {
    throw new Error("AI 返回格式无效");
  }
}

export class OpenAiCompatibleProvider implements AiProvider {
  private readonly config: Pick<AiConfig, "baseUrl" | "model">;
  private readonly apiKey: string;
  private readonly request: FetchLike;

  constructor(
    config: Pick<AiConfig, "baseUrl" | "model">,
    apiKey: string,
    request: FetchLike = (url, init) => fetch(url, init),
  ) {
    this.config = config;
    this.apiKey = apiKey;
    this.request = request;
  }

  async *chat(request: ChatRequest): AsyncIterable<string> {
    const response = await this.request(
      `${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: request.messages,
          stream: true,
        }),
        signal: request.signal,
      },
    );
    if (!response.ok) {
      throw new Error(connectionError(response.status));
    }
    if (!response.body) {
      throw new Error("AI 服务没有返回流式内容");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const result = await reader.read();
        buffer += decoder.decode(result.value, { stream: !result.done });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const delta = parseDelta(line);
          if (delta) {
            yield delta;
          }
        }
        if (result.done) {
          break;
        }
      }
      if (buffer) {
        const delta = parseDelta(buffer);
        if (delta) {
          yield delta;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
