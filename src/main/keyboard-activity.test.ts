import assert from "node:assert/strict";
import test from "node:test";

import { createKeyboardActivityService } from "./keyboard-activity.ts";

interface FakeKeyboardHook {
  listener?: () => void;
  started: number;
  stopped: number;
  onKeydown(listener: () => void): void;
  start(): void;
  stop(): void;
}

function createFakeKeyboardHook(): FakeKeyboardHook {
  return {
    started: 0,
    stopped: 0,
    onKeydown(listener) {
      this.listener = listener;
    },
    start() {
      this.started += 1;
    },
    stop() {
      this.stopped += 1;
    },
  };
}

test("键盘活动服务只转发无参数活动信号并可停止 hook", () => {
  const hook = createFakeKeyboardHook();
  let activityCount = 0;
  const service = createKeyboardActivityService(hook, () => {
    activityCount += 1;
  });

  service.start();
  service.start();
  hook.listener?.();
  service.stop();
  service.stop();

  assert.equal(activityCount, 1);
  assert.equal(hook.started, 1);
  assert.equal(hook.stopped, 1);
});

test("键盘 hook 启动失败时服务不会抛出并提供诊断", () => {
  const messages: string[] = [];
  const hook = createFakeKeyboardHook();
  hook.start = () => {
    throw new Error("native hook unavailable");
  };
  const service = createKeyboardActivityService(
    hook,
    () => {},
    (message) => messages.push(message),
  );

  assert.doesNotThrow(() => service.start());
  assert.deepEqual(messages, ["全局键盘监听启动失败，桌宠其他功能继续运行"]);
  assert.equal(hook.stopped, 1);
});
