import assert from "node:assert/strict";
import test from "node:test";

import { isActivePointer, isInHeadInteraction } from "./pet-interaction.ts";

const visual = {
  contentHeight: 180,
  footAnchor: { x: 96, y: 202 },
  headInteraction: { x: 32, y: 8, width: 128, height: 96 },
};

test("头部命中区域使用角色局部坐标", () => {
  assert.equal(isInHeadInteraction({ x: 96, y: 50 }, visual), true);
  assert.equal(isInHeadInteraction({ x: 31, y: 50 }, visual), false);
  assert.equal(isInHeadInteraction({ x: 96, y: 105 }, visual), false);
});

test("只处理发起当前手势的指针", () => {
  const gesture = { pointerId: 7 };

  assert.equal(isActivePointer(gesture, 7), true);
  assert.equal(isActivePointer(gesture, 8), false);
  assert.equal(isActivePointer(undefined, 7), false);
});
