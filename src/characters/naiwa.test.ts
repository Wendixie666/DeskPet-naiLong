import assert from "node:assert/strict";
import test from "node:test";

import { naiwa } from "./naiwa.ts";

test("奶蛙配置提供行为层需要的全部通用动作", () => {
  assert.equal(naiwa.actions.idle.kind, "image");
  assert.equal(naiwa.actions.walk.kind, "sprite");
  assert.ok(naiwa.clickActions.length > 1);
  assert.ok(naiwa.visual.contentHeight < naiwa.size.height);
  assert.equal(naiwa.visual.footAnchor.x, naiwa.size.width / 2);

  for (const action of naiwa.clickActions) {
    assert.ok(naiwa.actions[action]);
  }
});
