import assert from "node:assert/strict";
import test from "node:test";

import { settingsChannels } from "../shared/channels.ts";
import { registerSettingsSaveIpc } from "./settings-save-ipc.ts";

test("注册统一设置保存通道", () => {
  let channel = "";
  let listener: ((event: unknown, value: unknown) => unknown) | undefined;
  const coordinator = {
    save(value: unknown) {
      return {
        ok: true,
        message: JSON.stringify(value),
        saved: { app: true, ai: false },
        settings: {} as never,
        aiSettings: {} as never,
      };
    },
  };

  registerSettingsSaveIpc({
    handle(nextChannel, nextListener) {
      channel = nextChannel;
      listener = nextListener as typeof listener;
    },
  }, coordinator);

  assert.equal(channel, settingsChannels.save);
  assert.deepEqual(listener?.({}, { settings: "draft" }), coordinator.save({
    settings: "draft",
  }));
});
