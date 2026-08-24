import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createSettingsManager,
  defaultSettings,
} from "./settings.ts";

test("设置写入失败时恢复运行状态与当前设置", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "deskpet-settings-"));
  const blockedParent = path.join(directory, "blocked");
  writeFileSync(blockedParent, "not a directory");
  const appliedScales: number[] = [];
  const manager = createSettingsManager(
    path.join(blockedParent, "settings.json"),
    (id) => id === "naiwa",
    (settings) => appliedScales.push(settings.petScale),
  );

  try {
    assert.throws(() => manager.update({
      ...defaultSettings,
      petScale: 1.25,
    }));
    assert.deepEqual(manager.get(), defaultSettings);
    assert.deepEqual(appliedScales, []);
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("设置应用失败时恢复先前运行状态", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "deskpet-settings-"));
  const appliedScales: number[] = [];
  const manager = createSettingsManager(
    path.join(directory, "settings.json"),
    (id) => id === "naiwa",
    (settings) => {
      appliedScales.push(settings.petScale);
      if (settings.petScale === 1.25) {
        throw new Error("应用失败");
      }
    },
  );

  try {
    assert.throws(() => manager.update({
      ...defaultSettings,
      petScale: 1.25,
    }), /应用失败/);
    assert.deepEqual(manager.get(), defaultSettings);
    assert.deepEqual(appliedScales, [1.25, 1]);
    const reloaded = createSettingsManager(
      path.join(directory, "settings.json"),
      (id) => id === "naiwa",
      () => {},
    );
    assert.deepEqual(reloaded.get(), defaultSettings);
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("设置文件缺失时使用默认值，保存后可重新读取", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "deskpet-settings-"));
  const filePath = path.join(directory, "settings.json");
  const manager = createSettingsManager(
    filePath,
    (id) => id === "naiwa",
    () => {},
  );

  try {
    assert.deepEqual(manager.get(), defaultSettings);

    manager.update({
      ...defaultSettings,
      petScale: 1.25,
      defaultPosition: "last",
      lastPosition: { x: -300, y: 80 },
      theme: "dark",
    });

    manager.saveLastPosition({ x: -300, y: 80 });
    const reloaded = createSettingsManager(
      filePath,
      (id) => id === "naiwa",
      () => {},
    );
    assert.deepEqual(reloaded.get(), {
      ...defaultSettings,
      petScale: 1.25,
      defaultPosition: "last",
      lastPosition: { x: -300, y: 80 },
      theme: "dark",
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
    theme: "neon",
  }));

  try {
    const manager = createSettingsManager(
      filePath,
      (id) => id === "naiwa",
      () => {},
    );
    assert.deepEqual(manager.get(), defaultSettings);
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("旧设置中的透明主题回退到浅色主题", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "deskpet-settings-"));
  const filePath = path.join(directory, "settings.json");
  writeFileSync(filePath, JSON.stringify({
    ...defaultSettings,
    theme: "transparent",
  }));

  try {
    const manager = createSettingsManager(
      filePath,
      (id) => id === "naiwa",
      () => {},
    );
    assert.equal(manager.get().theme, "light");
  } finally {
    rmSync(directory, { recursive: true });
  }
});
