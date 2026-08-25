import assert from "node:assert/strict";
import test from "node:test";

import { naiwa } from "../characters/naiwa.ts";
import { constrainPosition, scaledFootAnchor } from "./geometry.ts";

test("scaledFootAnchor 按缩放换算脚底中心锚点", () => {
  assert.deepEqual(scaledFootAnchor(naiwa, 1), naiwa.visual.footAnchor);
  assert.deepEqual(scaledFootAnchor(naiwa, 1.5), {
    x: naiwa.visual.footAnchor.x * 1.5,
    y: naiwa.visual.footAnchor.y * 1.5,
  });
});

test("constrainPosition 将脚底目标点限制在工作区内", () => {
  const size = { width: 100, height: 50 };
  const workArea = { x: 10, y: 20, width: 1_000, height: 500 };

  assert.deepEqual(
    constrainPosition({ x: 500, y: 300 }, size, workArea),
    { x: 500, y: 300 },
  );
});

test("constrainPosition 越界时贴齐工作区右下边界", () => {
  const size = { width: 100, height: 50 };
  const workArea = { x: 10, y: 20, width: 1_000, height: 500 };

  assert.deepEqual(
    constrainPosition({ x: 5_000, y: -3_000 }, size, workArea),
    { x: 910, y: 20 },
  );
});

test("constrainPosition 窗口大于工作区时贴齐工作区左上角", () => {
  const size = { width: 2_000, height: 1_000 };
  const workArea = { x: 10, y: 20, width: 1_000, height: 500 };

  assert.deepEqual(
    constrainPosition({ x: 400, y: 300 }, size, workArea),
    { x: 10, y: 20 },
  );
});
