import assert from "node:assert/strict";
import test from "node:test";

import {
  WINDOW_PERCH_SNAP_DISTANCE,
  findWindowPerchTarget,
  windowPerchPosition,
} from "./window-perch.ts";

test("窗口顶部停靠只选择普通窗口范围内最近的候选", () => {
  const target = findWindowPerchTarget(
    { x: 396, y: 338 },
    [
      {
        id: "far",
        bounds: { x: 250, y: 420, width: 800, height: 600 },
        isOrdinary: true,
        isMinimized: false,
      },
      {
        id: "near",
        bounds: { x: 250, y: 330, width: 800, height: 600 },
        isOrdinary: true,
        isMinimized: false,
      },
      {
        id: "panel",
        bounds: { x: 0, y: 382, width: 1_920, height: 40 },
        isOrdinary: false,
        isMinimized: false,
      },
    ],
  );

  assert.equal(target?.id, "near");
  assert.equal(WINDOW_PERCH_SNAP_DISTANCE, 96);
});

test("窗口顶部停靠允许鼠标距离顶部 96 像素以内", () => {
  const target = findWindowPerchTarget(
    { x: 400, y: 430 },
    [{
      id: "window",
      bounds: { x: 250, y: 513, width: 800, height: 600 },
      isOrdinary: true,
      isMinimized: false,
    }],
  );

  assert.equal(target?.id, "window");
});

test("窗口顶部停靠位置使用角色停靠锚点而不是整张窗口高度", () => {
  assert.deepEqual(
    windowPerchPosition(
      { x: 200, y: 400, width: 800, height: 600 },
      { width: 192, height: 208 },
      1,
      120,
    ),
    { x: 504, y: 280 },
  );
});
