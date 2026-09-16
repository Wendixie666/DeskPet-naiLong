import assert from "node:assert/strict";
import test from "node:test";

import type { AiProvider } from "./ai-provider.ts";
import { createChatService } from "./chat-service.ts";

test("ChatService 每次请求都加入当前角色人设并保留多轮消息", async () => {
  const requests: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  const provider: AiProvider = {
    async *chat(request) {
      requests.push(request);
      yield requests.length === 1 ? "第一句" : "第二句";
    },
  };
  const service = createChatService({
    getCharacter: () => ({
      chatUi: { title: "和奶蛙聊聊天", emptyState: "跟奶蛙说点什么吧" },
      id: "naiwa",
      name: "奶蛙",
      persona: { file: "naiwa.md" },
    }),
    getAiConfig: () => ({
      provider: "openai-compatible",
      baseUrl: "https://example.com/v1",
      model: "test-model",
    }),
    getApiKey: () => "sk-test-secret",
    loadPersona: () => "你是会陪用户聊天的奶蛙。",
    createProvider: () => provider,
  });

  const deltas: string[] = [];
  await service.send("naiwa", "你好", (delta) => deltas.push(delta));
  await service.send("naiwa", "再说一句", (delta) => deltas.push(delta));

  assert.deepEqual(deltas, ["第一句", "第二句"]);
  assert.equal(requests[0].messages[0].role, "system");
  assert.match(requests[0].messages[0].content, /奶蛙/);
  assert.match(requests[0].messages[0].content, /你是会陪用户聊天的奶蛙/);
  assert.deepEqual(requests[1].messages.slice(1), [
    { role: "user", content: "你好" },
    { role: "assistant", content: "第一句" },
    { role: "user", content: "再说一句" },
  ]);
  assert.equal(service.getState("naiwa").messages.length, 4);
});

test("ChatService 返回当前角色的聊天 UI 配置", () => {
  const service = createChatService({
    getCharacter: (id) => ({
      chatUi: id === "naiwa"
        ? { title: "和奶蛙聊聊天", emptyState: "跟奶蛙说点什么吧" }
        : { title: "和小猫聊聊天", emptyState: "叫小猫说句话吧" },
      id,
      name: id === "naiwa" ? "奶蛙" : "小猫",
    }),
    getAiConfig: () => ({ provider: "openai-compatible", baseUrl: "https://example.com/v1", model: "model" }),
    getApiKey: () => "secret",
    loadPersona: () => "persona",
    createProvider: () => ({ async *chat() { yield "ok"; } }),
  });

  assert.deepEqual(service.getState("naiwa").chatUi, {
    title: "和奶蛙聊聊天",
    emptyState: "跟奶蛙说点什么吧",
  });
  assert.deepEqual(service.getState("cat").chatUi, {
    title: "和小猫聊聊天",
    emptyState: "叫小猫说句话吧",
  });
});

test("ChatService 清空当前角色聊天记录并拒绝空消息", async () => {
  const service = createChatService({
    getCharacter: () => ({
      chatUi: { title: "和奶蛙聊聊天", emptyState: "跟奶蛙说点什么吧" },
      id: "naiwa",
      name: "奶蛙",
      persona: { file: "naiwa.md" },
    }),
    getAiConfig: () => ({ provider: "openai-compatible", baseUrl: "https://example.com/v1", model: "model" }),
    getApiKey: () => "secret",
    loadPersona: () => "persona",
    createProvider: () => ({ async *chat() { yield "ok"; } }),
  });

  await assert.rejects(() => service.send("naiwa", "  ", () => {}), /消息不能为空/);
  await service.send("naiwa", "消息", () => {});
  assert.equal(service.clear("naiwa").messages.length, 0);
  assert.equal(service.getState("naiwa").generating, false);
});

test("ChatService 停止生成时保留已经收到的部分回复", async () => {
  const service = createChatService({
    getCharacter: () => ({
      chatUi: { title: "和奶蛙聊聊天", emptyState: "跟奶蛙说点什么吧" },
      id: "naiwa",
      name: "奶蛙",
      persona: { file: "naiwa.md" },
    }),
    getAiConfig: () => ({ provider: "openai-compatible", baseUrl: "https://example.com/v1", model: "model" }),
    getApiKey: () => "secret",
    loadPersona: () => "persona",
    createProvider: () => ({
      async *chat({ signal }) {
        yield "半句";
        await new Promise<void>((resolve) => {
          signal?.addEventListener("abort", () => resolve(), { once: true });
        });
        const error = new Error("已停止");
        error.name = "AbortError";
        throw error;
      },
    }),
  });
  const controller = new AbortController();
  let received = false;
  const sending = service.send("naiwa", "开始", () => {
    received = true;
  }, controller.signal);

  while (!received) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  controller.abort();
  await sending;

  assert.deepEqual(service.getState("naiwa").messages.map(({ role, content }) => ({ role, content })), [
    { role: "user", content: "开始" },
    { role: "assistant", content: "半句" },
  ]);
  assert.equal(service.getState("naiwa").generating, false);
});
