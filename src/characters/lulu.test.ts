import assert from "node:assert/strict";
import test from "node:test";

import { lulu } from "./lulu.ts";

test("噜噜配置提供现有素材对应的基础动作", () => {
  assert.equal(lulu.actions.idle.asset, "默认状态.png");
  assert.equal(lulu.actions.walk.asset, "跑步.png");
  assert.equal(lulu.actions.walk.frameCount, 8);
  assert.equal(lulu.actions.wave.asset, "打招呼.png");
  assert.equal(lulu.actions.wave.frameCount, 6);
  assert.equal(lulu.actions.drag.asset, "被提起.png");
  assert.equal(lulu.actions.typing.asset, "打字.png");
  assert.equal(lulu.actions.typing.frameCount, 6);
  assert.deepEqual(lulu.interactionActions, {
    climb: "walk",
    drag: "drag",
    pat: "wave",
  });
  assert.deepEqual(lulu.clickActions, ["wave"]);
});
