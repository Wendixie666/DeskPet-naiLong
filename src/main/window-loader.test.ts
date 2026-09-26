import assert from "node:assert/strict";
import test from "node:test";

import { loadRendererPage } from "./window-loader.ts";

test("渲染页面加载成功后才显示窗口", async () => {
  const calls: string[] = [];
  const window = {
    async loadFile(filePath: string) {
      calls.push(`load:${filePath}`);
    },
    isDestroyed: () => false,
    show() {
      calls.push("show");
    },
  };

  await loadRendererPage(window, "settings.html", "/app.asar");

  assert.deepEqual(calls, ["load:/app.asar/src/renderer/settings.html", "show"]);
});

test("渲染页面加载失败时不显示窗口", async () => {
  const calls: string[] = [];
  const originalError = console.error;
  const window = {
    async loadFile() {
      calls.push("load");
      throw new Error("页面不存在");
    },
    isDestroyed: () => false,
    show() {
      calls.push("show");
    },
  };

  console.error = () => {};
  try {
    await loadRendererPage(window, "settings.html", "/app.asar");
  } finally {
    console.error = originalError;
  }

  assert.deepEqual(calls, ["load"]);
});
