import assert from "node:assert/strict";
import test from "node:test";

import { xiaohei } from "./xiaohei.ts";

test("罗小黑配置提供第一批基础动作", () => {
  assert.equal(xiaohei.name, "罗小黑");
  assert.equal(xiaohei.assetRoot, "../../素材/罗小黑");
  assert.deepEqual(xiaohei.size, { width: 200, height: 220 });
  assert.deepEqual(xiaohei.interactionActions, {
    climb: "walk",
    drag: "wiggle",
  });
  assert.deepEqual(xiaohei.clickActions, ["wave", "playHeixiu"]);
  assert.deepEqual(
    Object.fromEntries(
      ["idle", "walk", "wave", "playHeixiu", "wiggle"]
        .map((name) => [name, xiaohei.actions[name].asset]),
    ),
    {
      idle: "main-base.png",
      walk: "main-run.gif",
      wave: "main-wave.gif",
      playHeixiu: "main-play-heixiu.gif",
      wiggle: "main-wiggle.gif",
    },
  );
});
