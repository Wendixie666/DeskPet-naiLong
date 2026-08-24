import assert from "node:assert/strict";
import test from "node:test";

import { naiwa } from "../characters/naiwa.ts";
import { resizePetWindow } from "./pet-window.ts";

test("缩放从 1 到 1.5 再到 0.75 时真实窗口可缩回并保持脚底位置", () => {
  let bounds = { x: 100, y: 200, width: 192, height: 208 };
  const setBoundsCalls: Array<typeof bounds> = [];
  const window = {
    getBounds: () => bounds,
    setBounds(nextBounds: typeof bounds) {
      bounds = nextBounds;
      setBoundsCalls.push(bounds);
    },
    workAreaAt: () => ({ x: 0, y: 0, width: 1_920, height: 1_040 }),
  };

  resizePetWindow(window, naiwa, 1, naiwa, 1.5);
  resizePetWindow(window, naiwa, 1.5, naiwa, 0.75);

  assert.deepEqual(setBoundsCalls, [
    { x: 52, y: 99, width: 288, height: 312 },
    { x: 124, y: 251, width: 144, height: 156 },
  ]);
});

test("窗口 setBounds 失败时不会产生可提交的新几何状态", () => {
  let bounds = { x: 100, y: 200, width: 192, height: 208 };
  const window = {
    getBounds: () => bounds,
    setBounds() {
      throw new Error("setBounds failed");
    },
    workAreaAt: () => ({ x: 0, y: 0, width: 1_920, height: 1_040 }),
  };

  assert.throws(
    () => resizePetWindow(window, naiwa, 1, naiwa, 1.5),
    /setBounds failed/,
  );
  assert.deepEqual(bounds, { x: 100, y: 200, width: 192, height: 208 });
});
