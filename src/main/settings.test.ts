import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createSettingsStore, defaultSettings } from "./settings.ts";

test("设置文件缺失时使用默认值，保存后可重新读取", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "deskpet-settings-"));
  const filePath = path.join(directory, "settings.json");
  const store = createSettingsStore(filePath, (id) => id === "naiwa");

  try {
    assert.deepEqual(store.load(), defaultSettings);

    store.save({
      ...defaultSettings,
      petScale: 1.25,
      defaultPosition: "last",
      lastPosition: { x: -300, y: 80 },
    });

    assert.deepEqual(store.load(), {
      ...defaultSettings,
      petScale: 1.25,
      defaultPosition: "last",
      lastPosition: { x: -300, y: 80 },
    });
    assert.doesNotThrow(() => JSON.parse(readFileSync(filePath, "utf8")));
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("无效设置字段回退到默认值", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "deskpet-settings-"));
  const filePath = path.join(directory, "settings.json");
  writeFileSync(filePath, JSON.stringify({
    characterId: "missing",
    petScale: 9,
    defaultPosition: "center",
    summonShortcut: "",
  }));

  try {
    const store = createSettingsStore(filePath, (id) => id === "naiwa");
    assert.deepEqual(store.load(), defaultSettings);
  } finally {
    rmSync(directory, { recursive: true });
  }
});
