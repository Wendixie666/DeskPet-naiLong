import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createAiConfigStore,
  defaultAiConfig,
  normalizeAiConfig,
  validateAiConfig,
} from "./ai-config.ts";

test("非法 AI 配置规范化为安全默认值", () => {
  assert.deepEqual(normalizeAiConfig({
    provider: "claude",
    baseUrl: "not a url",
    model: 42,
  }), defaultAiConfig);
});

test("AI 配置校验要求 HTTP 地址和模型", () => {
  assert.throws(
    () => validateAiConfig({
      provider: "openai-compatible",
      baseUrl: "file:///tmp/api",
      model: "model",
    }),
    /Base URL 必须是有效的 HTTP 或 HTTPS 地址/,
  );
  assert.throws(
    () => validateAiConfig({
      provider: "openai-compatible",
      baseUrl: "https://example.com/v1",
      model: "",
    }),
    /Model 不能为空/,
  );
});

test("AI 配置支持 DeepSeek 服务商", () => {
  assert.deepEqual(validateAiConfig({
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-flash",
  }), {
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-flash",
  });
});

test("AI 普通配置单独持久化且不包含 API Key", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "deskpet-ai-config-"));
  const filePath = path.join(directory, "ai-config.json");
  const store = createAiConfigStore(filePath);

  try {
    assert.deepEqual(store.load(), defaultAiConfig);
    const saved = store.save({
      provider: "openai-compatible",
      baseUrl: "https://example.com/v1/",
      model: "test-model",
    });
    assert.deepEqual(saved, {
      provider: "openai-compatible",
      baseUrl: "https://example.com/v1",
      model: "test-model",
    });
    assert.doesNotMatch(readFileSync(filePath, "utf8"), /apiKey|secret/);
    assert.deepEqual(store.load(), saved);
  } finally {
    rmSync(directory, { recursive: true });
  }
});
