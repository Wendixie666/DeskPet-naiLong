import assert from "node:assert/strict";
import test from "node:test";

import {
  directionFrame,
  introFrames,
  spriteFrameIndex,
} from "./pet-animation.ts";
import type { DirectionalSpriteAction } from "../shared/types";

const action: DirectionalSpriteAction = {
  assets: ["a.png", "b.png"],
  frameCount: 7,
  frameDurationMs: 100,
  kind: "directional-sprite",
};

test("introFrames 生成 4 段各 frameCount 帧的入场序列", () => {
  const frames = introFrames(action);

  assert.equal(frames.length, 28);
  assert.deepEqual(frames.slice(0, 7)[0], {
    assetIndex: 1,
    frameIndex: 0,
    mirrored: false,
  });
  assert.deepEqual(frames.slice(7, 14)[0], {
    assetIndex: 0,
    frameIndex: 0,
    mirrored: false,
  });
  assert.deepEqual(frames.slice(14, 21)[0], {
    assetIndex: 0,
    frameIndex: 6,
    mirrored: true,
  });
  assert.deepEqual(frames.slice(21, 28)[0], {
    assetIndex: 1,
    frameIndex: 6,
    mirrored: true,
  });
});

test("directionFrame 右向取末帧不镜像，左向镜像", () => {
  assert.deepEqual(directionFrame(action, "right"), {
    assetIndex: 0,
    frameIndex: 6,
    mirrored: false,
  });
  assert.deepEqual(directionFrame(action, "left"), {
    assetIndex: 0,
    frameIndex: 6,
    mirrored: true,
  });
  assert.deepEqual(directionFrame(action, "down"), {
    assetIndex: 1,
    frameIndex: 0,
    mirrored: false,
  });
});

test("Codex v2 方向图集按 16 个方向直接取帧", () => {
  const action: DirectionalSpriteAction = {
    assets: ["look-up.processed.png", "look-down.processed.png"],
    frameCount: 8,
    frameDurationMs: 120,
    kind: "directional-sprite",
    directionalMode: "direct-16",
  };

  assert.deepEqual(directionFrame(action, "up"), {
    assetIndex: 0,
    frameIndex: 0,
    mirrored: false,
  });
  assert.deepEqual(directionFrame(action, "right"), {
    assetIndex: 0,
    frameIndex: 4,
    mirrored: false,
  });
  assert.deepEqual(directionFrame(action, "down"), {
    assetIndex: 1,
    frameIndex: 0,
    mirrored: false,
  });
  assert.deepEqual(directionFrame(action, "left"), {
    assetIndex: 1,
    frameIndex: 4,
    mirrored: false,
  });
});

test("spriteFrameIndex 播放到指定帧后定格", () => {
  const action = {
    asset: "reminder.png",
    frameCount: 6,
    frameDurationMs: 100,
    holdFrameIndex: 3,
    kind: "sprite" as const,
  };

  assert.equal(spriteFrameIndex(action, 299), 2);
  assert.equal(spriteFrameIndex(action, 300), 3);
  assert.equal(spriteFrameIndex(action, 1_000), 3);
});
