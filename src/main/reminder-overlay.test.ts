import assert from "node:assert/strict";
import test from "node:test";

import { reminderOverlayPosition } from "./reminder-overlay-position.ts";

const overlaySize = { width: 280, height: 88 };
const workArea = { x: 0, y: 0, width: 1_920, height: 1_080 };

test("提醒卡片默认出现在奶蛙右上方", () => {
  assert.deepEqual(
    reminderOverlayPosition(
      { x: 1_000, y: 400, width: 192, height: 208 },
      workArea,
      overlaySize,
    ),
    { x: 1_202, y: 320 },
  );
});

test("右侧空间不足时提醒卡片切到左侧", () => {
  assert.deepEqual(
    reminderOverlayPosition(
      { x: 1_760, y: 400, width: 192, height: 208 },
      workArea,
      overlaySize,
    ),
    { x: 1_470, y: 320 },
  );
});

test("提醒卡片位置会限制在工作区内", () => {
  assert.deepEqual(
    reminderOverlayPosition(
      { x: 0, y: 0, width: 192, height: 208 },
      workArea,
      overlaySize,
    ),
    { x: 202, y: 0 },
  );
});
