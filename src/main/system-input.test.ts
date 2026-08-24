import assert from "node:assert/strict";
import test from "node:test";

import { cursorToWindowPosition } from "./system-input.ts";

test("鼠标位置换算为桌宠脚底中心对齐的窗口坐标", () => {
  const position = cursorToWindowPosition(
    { x: 500, y: 600 },
    { width: 192, height: 208 },
    { x: 96, y: 202 },
    { x: 0, y: 0, width: 1920, height: 1040 },
  );

  assert.deepEqual(position, { x: 404, y: 398 });
});

test("在鼠标所在的负坐标屏幕内限制桌宠窗口", () => {
  const position = cursorToWindowPosition(
    { x: -10, y: 1030 },
    { width: 192, height: 208 },
    { x: 96, y: 202 },
    { x: -1280, y: 0, width: 1280, height: 1040 },
  );

  assert.deepEqual(position, { x: -192, y: 828 });
});
