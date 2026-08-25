import assert from "node:assert/strict";
import test from "node:test";

import { createShortcutManager } from "./summon-shortcut.ts";

interface FakeRegistrar {
  registered: string[];
  unregistered: string[];
  register(shortcut: string, callback: () => void): boolean;
  unregister(shortcut: string): void;
}

function createFakeRegistrar(failOn: Set<string> = new Set()): FakeRegistrar {
  return {
    registered: [],
    unregistered: [],
    register(shortcut, _callback) {
      if (failOn.has(shortcut)) {
        return false;
      }
      this.registered.push(shortcut);
      return true;
    },
    unregister(shortcut) {
      this.unregistered.push(shortcut);
    },
  };
}

test("相同快捷键重复应用时直接成功且不重复注册", () => {
  const registrar = createFakeRegistrar();
  const manager = createShortcutManager(registrar, () => {});

  assert.equal(manager.apply("Alt+P"), true);
  assert.equal(manager.apply("Alt+P"), true);
  assert.deepEqual(registrar.registered, ["Alt+P"]);
});

test("更换快捷键时注销旧键并注册新键", () => {
  const registrar = createFakeRegistrar();
  const manager = createShortcutManager(registrar, () => {});

  manager.apply("Alt+P");
  assert.equal(manager.apply("Alt+Q"), true);
  assert.deepEqual(registrar.registered, ["Alt+P", "Alt+Q"]);
  assert.deepEqual(registrar.unregistered, ["Alt+P"]);
});

test("新快捷键注册失败时回滚到旧快捷键", () => {
  const registrar = createFakeRegistrar(new Set(["Alt+Q"]));
  const manager = createShortcutManager(registrar, () => {});

  assert.equal(manager.apply("Alt+P"), true);
  assert.equal(manager.apply("Alt+Q"), false);
  assert.deepEqual(registrar.unregistered, ["Alt+P"]);
  assert.deepEqual(registrar.registered, ["Alt+P", "Alt+P"]);
});

test("注册函数抛出异常时按失败处理", () => {
  const failing: FakeRegistrar = {
    registered: [],
    unregistered: [],
    register() {
      throw new Error("已被占用");
    },
    unregister() {},
  };
  const manager = createShortcutManager(failing, () => {});

  assert.equal(manager.apply("Alt+P"), false);
});

test("无旧键且新键失败时返回 false", () => {
  const registrar = createFakeRegistrar(new Set(["Alt+P"]));
  const manager = createShortcutManager(registrar, () => {});

  assert.equal(manager.apply("Alt+P"), false);
});
