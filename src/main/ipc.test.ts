import assert from "node:assert/strict";
import test from "node:test";

import { registerPetIpc } from "./ipc.ts";

test("注册全部宠物与设置通道", () => {
  const handled: string[] = [];
  const sent: string[] = [];
  const ipc = {
    handle(channel: string) {
      handled.push(channel);
    },
    on(channel: string) {
      sent.push(channel);
    },
  };
  const calls: string[] = [];
  registerPetIpc(ipc, {
    click() {
      calls.push("click");
    },
    contextMenu() {
      calls.push("contextMenu");
    },
    dragBy() {
      calls.push("dragBy");
    },
    getSettings: () => ({ settings: {} }) as never,
    snapshot: () => ({}) as never,
    summon() {
      calls.push("summon");
    },
    updateSettings: () => ({ settings: {} }) as never,
  });

  assert.deepEqual(handled.sort(), ["pet:snapshot", "settings:get", "settings:update"]);
  assert.deepEqual(sent.sort(), [
    "pet:click",
    "pet:context-menu",
    "pet:drag-by",
    "pet:summon",
  ]);
});
