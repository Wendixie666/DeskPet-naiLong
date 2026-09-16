import assert from "node:assert/strict";
import test from "node:test";

import type { AiConfig } from "../ai/ai-config.ts";
import {
  createAiSettingsIpcHandlers,
  registerAiSettingsIpc,
} from "./ai-settings-ipc.ts";
import { aiSettingsChannels } from "../shared/channels.ts";

const config: AiConfig = {
  provider: "openai-compatible",
  baseUrl: "https://example.com/v1",
  model: "test-model",
};

test("AI 设置 snapshot 只暴露是否存在 API Key", async () => {
  let currentConfig = config;
  let apiKey = "sk-test-secret";
  const handlers = createAiSettingsIpcHandlers(
    {
      load: () => currentConfig,
      save: (value) => {
        currentConfig = value as AiConfig;
        return currentConfig;
      },
    },
    {
      has: () => apiKey.length > 0,
      read: () => apiKey,
      save: (value) => {
        apiKey = value;
      },
      remove: () => {
        apiKey = "";
      },
    },
    async () => new Response("{}", { status: 200 }),
  );

  const snapshot = handlers.get();
  assert.deepEqual(snapshot, { config, hasApiKey: true });
  assert.equal(JSON.stringify(snapshot).includes(apiKey), false);

  handlers.removeApiKey();
  assert.deepEqual(handlers.get(), { config, hasApiKey: false });
});

test("测试连接由 main 使用配置和 API Key 请求模型", async () => {
  let request: { url: string; init: RequestInit } | undefined;
  const handlers = createAiSettingsIpcHandlers(
    { load: () => config, save: () => config },
    {
      has: () => true,
      read: () => "sk-test-secret",
      save: () => {},
      remove: () => {},
    },
    async (url, init) => {
      request = { url: String(url), init: init! };
      return new Response("{}", { status: 200 });
    },
  );

  assert.deepEqual(await handlers.test(), {
    ok: true,
    message: "连接成功",
  });
  assert.equal(request?.url, "https://example.com/v1/chat/completions");
  assert.equal(request?.init.headers instanceof Headers, false);
  assert.equal(
    (request?.init.headers as Record<string, string>).Authorization,
    "Bearer sk-test-secret",
  );
  assert.match(String(request?.init.body), /test-model/);
});

test("测试连接隐藏认证失败细节", async () => {
  const handlers = createAiSettingsIpcHandlers(
    { load: () => config, save: () => config },
    {
      has: () => true,
      read: () => "sk-test-secret",
      save: () => {},
      remove: () => {},
    },
    async () => new Response("Bearer sk-test-secret", { status: 401 }),
  );

  const result = await handlers.test();
  assert.deepEqual(result, { ok: false, message: "API Key 无效" });
  assert.equal(JSON.stringify(result).includes("sk-test-secret"), false);
});

test("注册 AI 设置 IPC 通道", () => {
  const handled: string[] = [];
  registerAiSettingsIpc({
    handle(channel: string) {
      handled.push(channel);
    },
  }, {
    get: () => ({ config, hasApiKey: false }),
    update: () => ({ config, hasApiKey: false }),
    saveApiKey: () => ({ config, hasApiKey: true }),
    removeApiKey: () => ({ config, hasApiKey: false }),
    test: async () => ({ ok: true, message: "连接成功" }),
  });

  assert.deepEqual(handled.sort(), Object.values(aiSettingsChannels).sort());
});
