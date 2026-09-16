import assert from "node:assert/strict";
import test from "node:test";

import type {
  AiConfig,
  AiSettingsSnapshot,
  AppSettings,
  SettingsSaveRequest,
  SettingsSnapshot,
} from "../shared/types.ts";
import { createSettingsCoordinator } from "./settings-coordinator.ts";

const appSettings: AppSettings = {
  characterId: "naiwa",
  defaultPosition: "bottom-right",
  petScale: 1,
  summonShortcut: "CommandOrControl+Alt+P",
  theme: "light",
};

const aiConfig: AiConfig = {
  provider: "openai-compatible",
  baseUrl: "https://example.com/v1",
  model: "test-model",
};

const appSnapshot: SettingsSnapshot = {
  characters: [{ id: "naiwa", name: "奶蛙" }],
  petScales: [1],
  settings: appSettings,
};

function createAiSettingsFake(
  initial: AiSettingsSnapshot = { config: aiConfig, hasApiKey: false },
) {
  let snapshot = initial;
  const calls: string[] = [];
  return {
    calls,
    handlers: {
      get: () => snapshot,
      update: (value: unknown) => {
        calls.push("ai.update");
        snapshot = { config: value as AiConfig, hasApiKey: snapshot.hasApiKey };
        return snapshot;
      },
      saveApiKey: (_apiKey: string) => {
        calls.push("ai.saveApiKey");
        snapshot = { ...snapshot, hasApiKey: true };
        return snapshot;
      },
    },
  };
}

test("一次保存编排 AI 设置和桌宠设置，并只返回安全 snapshot", () => {
  const ai = createAiSettingsFake();
  const calls: string[] = [];
  const coordinator = createSettingsCoordinator(
    {
      update: () => {
        calls.push("app.update");
        return appSettings;
      },
    },
    ai.handlers,
    () => appSnapshot,
    () => calls.push("app.applied"),
  );

  const request: SettingsSaveRequest = {
    settings: appSettings,
    ai: { config: aiConfig, apiKey: "sk-test-secret" },
  };
  const result = coordinator.save(request);

  assert.equal(result.ok, true);
  assert.deepEqual(result.saved, { app: true, ai: true });
  assert.deepEqual([...ai.calls, ...calls], [
    "ai.update",
    "ai.saveApiKey",
    "app.update",
    "app.applied",
  ]);
  assert.equal(JSON.stringify(result).includes("sk-test-secret"), false);
});

test("AI 设置部分失败时不隐藏已保存状态，也不调用桌宠设置", () => {
  const ai = createAiSettingsFake();
  ai.handlers.saveApiKey = () => {
    ai.calls.push("ai.saveApiKey");
    throw new Error("系统安全存储不可用，无法保存 API Key");
  };
  let appUpdated = false;
  const coordinator = createSettingsCoordinator(
    {
      update: () => {
        appUpdated = true;
        return appSettings;
      },
    },
    ai.handlers,
    () => appSnapshot,
    () => {},
  );

  const result = coordinator.save({
    settings: appSettings,
    ai: { config: aiConfig, apiKey: "sk-test-secret" },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.saved, { app: false, ai: true });
  assert.equal(appUpdated, false);
  assert.match(result.message, /AI 设置部分保存失败/);
  assert.equal(JSON.stringify(result).includes("sk-test-secret"), false);
});

test("桌宠设置失败时返回 AI 已保存的部分结果", () => {
  const ai = createAiSettingsFake();
  const coordinator = createSettingsCoordinator(
    {
      update: () => {
        throw new Error("快捷键被占用");
      },
    },
    ai.handlers,
    () => ({ ...appSnapshot, settings: appSettings }),
    () => {},
  );

  const result = coordinator.save({
    settings: appSettings,
    ai: { config: aiConfig, apiKey: "sk-test-secret" },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.saved, { app: false, ai: true });
  assert.match(result.message, /AI 设置已保存/);
  assert.equal(JSON.stringify(result).includes("sk-test-secret"), false);
});
