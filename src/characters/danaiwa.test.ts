import assert from "node:assert/strict";
import test from "node:test";

import { danaiwa } from "./danaiwa.ts";

test("大奶蛙配置复用 Codex v2 图集并覆盖运行时动作", () => {
  assert.equal(danaiwa.assetRoot, "../../素材/大奶蛙/processed");
  assert.deepEqual(danaiwa.size, { width: 192, height: 208 });
  assert.deepEqual(danaiwa.interactionActions, {
    climb: "walk",
    drag: "drag",
    reminder: "reminder",
    windowPerch: "windowPerch",
  });
  assert.deepEqual(danaiwa.actions.idle, {
    asset: "idle.processed.png",
    frameCount: 6,
    frameDurationMs: 180,
    kind: "sprite",
  });
  assert.deepEqual(danaiwa.actions.look, {
    assets: ["look-up.processed.png", "look-down.processed.png"],
    frameCount: 8,
    frameDurationMs: 120,
    kind: "directional-sprite",
    directionalMode: "direct-16",
  });
  for (const action of danaiwa.clickActions) {
    assert.ok(danaiwa.actions[action]);
  }
});
