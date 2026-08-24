import assert from "node:assert/strict";
import test from "node:test";

import { resolveLookDirection } from "./look-direction.ts";

test("按鼠标相对桌宠中心的角度划分八个方向", () => {
  const bounds = { x: 100, y: 100, width: 200, height: 200 };

  assert.equal(resolveLookDirection({ x: 200, y: 0 }, bounds), "up");
  assert.equal(resolveLookDirection({ x: 400, y: 100 }, bounds), "up-right");
  assert.equal(resolveLookDirection({ x: 400, y: 200 }, bounds), "right");
  assert.equal(resolveLookDirection({ x: 400, y: 400 }, bounds), "down-right");
  assert.equal(resolveLookDirection({ x: 200, y: 400 }, bounds), "down");
  assert.equal(resolveLookDirection({ x: 0, y: 400 }, bounds), "down-left");
  assert.equal(resolveLookDirection({ x: 0, y: 200 }, bounds), "left");
  assert.equal(resolveLookDirection({ x: 0, y: 0 }, bounds), "up-left");
});
