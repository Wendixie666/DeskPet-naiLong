import assert from "node:assert/strict";
import test from "node:test";

import { calculateVisualPlacement } from "./visual-layout.ts";

test("不同尺寸素材使用统一视觉高度和脚底中心", () => {
  const compact = calculateVisualPlacement(
    { x: 20, y: 10, width: 100, height: 100 },
    { contentHeight: 160, footAnchor: { x: 96, y: 200 } },
  );
  const large = calculateVisualPlacement(
    { x: 40, y: 20, width: 200, height: 200 },
    { contentHeight: 160, footAnchor: { x: 96, y: 200 } },
  );

  assert.deepEqual(compact, { scale: 1.6, x: -16, y: 24 });
  assert.deepEqual(large, { scale: 0.8, x: -16, y: 24 });
});

test("动作可以小幅调整 scale 和 offset", () => {
  const placement = calculateVisualPlacement(
    { x: 20, y: 10, width: 100, height: 100 },
    { contentHeight: 160, footAnchor: { x: 96, y: 200 } },
    { scale: 0.9, offset: { x: 3, y: -4 } },
  );

  assert.ok(Math.abs(placement.scale - 1.44) < 0.001);
  assert.ok(Math.abs(placement.x - -1.8) < 0.001);
  assert.ok(Math.abs(placement.y - 37.6) < 0.001);
});
