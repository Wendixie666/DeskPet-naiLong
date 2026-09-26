import assert from "node:assert/strict";
import test from "node:test";

import { xiaohei } from "./xiaohei.ts";

test("罗小黑配置提供第一批基础动作", () => {
  assert.equal(xiaohei.name, "罗小黑");
  assert.equal(xiaohei.assetRoot, "../../素材/罗小黑/processed");
  assert.deepEqual(xiaohei.size, { width: 200, height: 220 });
  assert.deepEqual(xiaohei.interactionActions, {
    climb: "walk",
    drag: "wiggle",
  });
  assert.deepEqual(xiaohei.clickActions, ["wave", "playHeixiu"]);
  assert.deepEqual(xiaohei.actions.idle, {
    kind: "image",
    asset: "idle-hd.png",
    adjustment: { scale: 0.87 },
  });
  assert.deepEqual(xiaohei.actions.walk, {
    kind: "sprite",
    asset: "walk.processed.png",
    frameCount: 12,
    frameDurationMs: 80,
  });
  assert.deepEqual(xiaohei.actions.wave, {
    kind: "sprite",
    asset: "wave.processed.png",
    frameCount: 34,
    frameDurationMs: 80,
  });
  assert.deepEqual(xiaohei.actions.playHeixiu, {
    kind: "sprite",
    asset: "play-heixiu.processed.png",
    frameCount: 8,
    frameDurationMs: 80,
  });
  assert.deepEqual(xiaohei.actions.wiggle, {
    kind: "sprite",
    asset: "wiggle.processed.png",
    frameCount: 11,
    frameDurationMs: 70,
  });
});
