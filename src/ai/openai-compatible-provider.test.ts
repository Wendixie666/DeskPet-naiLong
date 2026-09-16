import assert from "node:assert/strict";
import test from "node:test";

import { OpenAiCompatibleProvider } from "./openai-compatible-provider.ts";

test("OpenAI Compatible Provider 发送多轮消息并解析流式增量", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const provider = new OpenAiCompatibleProvider(
    {
      baseUrl: "https://example.com/v1/",
      model: "test-model",
    },
    "sk-test-secret",
    async (url, init) => {
      requestUrl = url;
      requestInit = init;
      return new Response(
        "data: {\"choices\":[{\"delta\":{\"content\":\"你好\"}}]}\n\n"
          + "data: {\"choices\":[{\"delta\":{\"content\":\"呀\"}}]}\n\n"
          + "data: [DONE]\n\n",
        { status: 200, headers: { "Content-Type": "text/event-stream" } },
      );
    },
  );

  const chunks: string[] = [];
  for await (const chunk of provider.chat({
    messages: [
      { role: "system", content: "persona" },
      { role: "user", content: "你好" },
      { role: "assistant", content: "嗨" },
    ],
  })) {
    chunks.push(chunk);
  }

  assert.equal(requestUrl, "https://example.com/v1/chat/completions");
  assert.equal((requestInit?.headers as Record<string, string>).Authorization, "Bearer sk-test-secret");
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    model: "test-model",
    messages: [
      { role: "system", content: "persona" },
      { role: "user", content: "你好" },
      { role: "assistant", content: "嗨" },
    ],
    stream: true,
  });
  assert.deepEqual(chunks, ["你好", "呀"]);
});

test("OpenAI Compatible Provider 将 HTTP 错误转换为安全提示", async () => {
  const provider = new OpenAiCompatibleProvider(
    { baseUrl: "https://example.com/v1", model: "test-model" },
    "sk-test-secret",
    async () => new Response("Bearer sk-test-secret", { status: 401 }),
  );

  await assert.rejects(
    async () => {
      for await (const _chunk of provider.chat({ messages: [] })) {
        // 预期请求在产生任何增量前失败。
      }
    },
    /API Key 无效/,
  );
});
