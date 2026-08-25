import assert from "node:assert/strict";
import test from "node:test";

import { registerPetIpc } from "./ipc.ts";
import { petChannels, settingsChannels } from "../shared/channels.ts";

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
    quit() {
      calls.push("quit");
    },
    snapshot: () => ({}) as never,
    updateSettings: () => ({ settings: {} }) as never,
  });

  assert.deepEqual(handled.sort(), [
    petChannels.snapshot,
    settingsChannels.get,
    settingsChannels.update,
  ]);
  assert.deepEqual(sent.sort(), [
    petChannels.click,
    petChannels.contextMenu,
    petChannels.dragBy,
    petChannels.quit,
  ]);
});
