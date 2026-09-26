import assert from "node:assert/strict";
import test from "node:test";

import { naiwa } from "./naiwa.ts";

test("奶蛙配置提供行为层需要的全部通用动作", () => {
  assert.equal(naiwa.actions.idle.kind, "image");
  assert.equal(naiwa.actions.walk.kind, "sprite");
  assert.ok(naiwa.clickActions.length > 1);
  assert.ok(naiwa.visual.contentHeight < naiwa.size.height);
  assert.deepEqual(naiwa.visual.dragAnchor, { x: 94, y: 22 });
  assert.equal(naiwa.visual.footAnchor.x, naiwa.size.width / 2);
  assert.deepEqual(naiwa.interactionActions, {
    climb: "climb",
    drag: "drag",
    reminder: "reminder",
    windowPerch: "windowPerch",
  });
  assert.equal(naiwa.visual.headInteraction, undefined);
  assert.equal(naiwa.visual.perchAnchorY, 120);
  assert.equal(naiwa.actions.climb.kind, "sprite");
  assert.equal(naiwa.actions.drag.kind, "image");
  assert.equal(naiwa.actions.typing.kind, "sprite");
  assert.equal(naiwa.actions.typing.frameCount, 6);
  assert.equal(naiwa.actions.typing.frameDurationMs, 120);
  assert.equal(naiwa.actions.reminder.kind, "sprite");
  assert.equal(naiwa.actions.reminder.asset, "生气.processed.png");
  assert.equal(naiwa.actions.reminder.holdFrameIndex, 3);
  assert.equal(naiwa.actions.windowPerch.kind, "sprite");
  assert.equal(naiwa.actions.windowPerch.anchor, "perch");
  assert.equal(naiwa.actions.windowPerch.asset, "坐姿.processed.png");
  assert.equal(naiwa.actions.windowPerch.frameCount, 5);

  for (const action of naiwa.clickActions) {
    assert.ok(naiwa.actions[action]);
  }
});
