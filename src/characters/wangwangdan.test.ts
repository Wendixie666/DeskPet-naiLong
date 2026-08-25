import assert from "node:assert/strict";
import test from "node:test";

import { wangwangdan } from "./wangwangdan.ts";

test("汪汪丹配置提供行为层需要的全部通用动作", () => {
  assert.equal(wangwangdan.actions.idle.kind, "image");
  assert.equal(wangwangdan.actions.walk.kind, "sprite");
  assert.ok(wangwangdan.clickActions.length > 1);
  assert.ok(wangwangdan.visual.contentHeight < wangwangdan.size.height);
  assert.equal(wangwangdan.visual.footAnchor.x, wangwangdan.size.width / 2);

  for (const action of wangwangdan.clickActions) {
    assert.ok(wangwangdan.actions[action]);
  }
});

test("汪汪丹点击动作顺序为先惊讶再跳舞", () => {
  assert.deepEqual(wangwangdan.clickActions, ["surprised", "dance"]);
});
