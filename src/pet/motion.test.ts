import assert from "node:assert/strict";
import test from "node:test";

import { createPetMotion } from "./motion.ts";

test("召唤以脚底中心为目标并推进桌宠窗口", () => {
  let position: [number, number] = [100, 200];
  const emittedPositions: Array<{ x: number; y: number }> = [];
  const motion = createPetMotion({
    character: {
      clickActions: ["wave"],
      speed: 1_000,
      visual: {
        contentHeight: 180,
        footAnchor: { x: 96, y: 202 },
      },
    },
    initialPosition: { x: 100, y: 200 },
    onStateChange(state) {
      emittedPositions.push(state.position);
    },
    scale: 1,
    window: {
      getBounds() {
        return { x: position[0], y: position[1], width: 192, height: 208 };
      },
      getPosition() {
        return position;
      },
      setPosition(x, y) {
        position = [x, y];
      },
      workAreaAt() {
        return { x: 0, y: 0, width: 1_920, height: 1_040 };
      },
    },
  });

  motion.summon({ x: 500, y: 600 });
  motion.tick(1_000);

  assert.deepEqual(position, [404, 398]);
  assert.deepEqual(motion.getState().position, { x: 404, y: 398 });
  assert.equal(motion.getState().action, "idle");
  assert.deepEqual(emittedPositions.at(-1), { x: 404, y: 398 });
});

test("连续召唤会生成新的动作序号", () => {
  const motion = createPetMotion({
    character: {
      clickActions: ["wave"],
      speed: 100,
      visual: {
        contentHeight: 180,
        footAnchor: { x: 96, y: 202 },
      },
    },
    initialPosition: { x: 100, y: 200 },
    onStateChange() {},
    scale: 1,
    window: {
      getBounds: () => ({ x: 100, y: 200, width: 192, height: 208 }),
      getPosition: () => [100, 200],
      setPosition() {},
      workAreaAt: () => ({ x: 0, y: 0, width: 1_920, height: 1_040 }),
    },
  });

  motion.summon({ x: 500, y: 600 });
  const firstSequence = motion.getState().actionSequence;
  motion.summon({ x: 700, y: 800 });

  assert.equal(motion.getState().action, "walk");
  assert.ok(motion.getState().actionSequence > firstSequence);
});

test("拖拽取消召唤，点击优先选择最近没有出现的动作", () => {
  let position: [number, number] = [100, 200];
  const states: string[] = [];
  const motion = createPetMotion({
    character: {
      clickActions: ["wave", "heart"],
      speed: 100,
      visual: {
        contentHeight: 180,
        footAnchor: { x: 96, y: 202 },
      },
    },
    initialPosition: { x: 100, y: 200 },
    onStateChange(state) {
      states.push(state.action);
    },
    scale: 1,
    window: {
      getBounds() {
        return { x: position[0], y: position[1], width: 192, height: 208 };
      },
      getPosition() {
        return position;
      },
      setPosition(x, y) {
        position = [x, y];
      },
      workAreaAt() {
        return { x: 0, y: 0, width: 1_920, height: 1_040 };
      },
    },
  });

  motion.summon({ x: 500, y: 600 });
  motion.dragBy(20, -30);
  motion.tick(1_000);
  motion.click();
  assert.equal(motion.getState().action, "wave");
  motion.click();

  assert.deepEqual(position, [120, 170]);
  assert.equal(motion.getState().isMoving, false);
  assert.equal(motion.getState().action, "heart");
  assert.deepEqual(states, ["walk", "idle", "wave", "heart"]);
});

test("再次切换到同一个动作也会生成新的动作序号", () => {
  const motion = createPetMotion({
    character: {
      clickActions: ["turnHead"],
      speed: 100,
      trackingAction: "turnHead",
      visual: {
        contentHeight: 180,
        footAnchor: { x: 96, y: 202 },
      },
    },
    initialPosition: { x: 100, y: 100 },
    onStateChange() {},
    scale: 1,
    window: {
      getBounds: () => ({ x: 100, y: 100, width: 200, height: 200 }),
      getPosition: () => [100, 100],
      setPosition() {},
      workAreaAt: () => ({ x: 0, y: 0, width: 1_920, height: 1_040 }),
    },
  });

  motion.click();
  const firstSequence = motion.getState().actionSequence;
  motion.click();

  assert.equal(motion.getState().action, "turnHead");
  assert.ok(motion.getState().actionSequence > firstSequence);
});

test("缩放后召回仍将脚底锚点对齐到目标坐标", () => {
  let position: [number, number] = [100, 200];
  const motion = createPetMotion({
    character: {
      clickActions: ["wave"],
      speed: 1_000,
      visual: {
        contentHeight: 180,
        footAnchor: { x: 96, y: 202 },
      },
    },
    initialPosition: { x: 100, y: 200 },
    onStateChange() {},
    scale: 0.75,
    window: {
      getBounds() {
        return { x: position[0], y: position[1], width: 144, height: 156 };
      },
      getPosition() {
        return position;
      },
      setPosition(x, y) {
        position = [x, y];
      },
      workAreaAt() {
        return { x: 0, y: 0, width: 1_920, height: 1_040 };
      },
    },
  });

  motion.summon({ x: 500, y: 600 });
  motion.tick(1_000);

  assert.deepEqual(position, [428, 449]);
  const footPosition = {
    x: position[0] + 96 * 0.75,
    y: position[1] + 202 * 0.75,
  };
  assert.equal(footPosition.x, 500);
  assert.ok(Math.abs(footPosition.y - 600) <= 0.5);
});

test("转头动作会根据主进程提供的鼠标坐标更新目光方向", () => {
  let cursor = { x: 200, y: 0 };
  const motion = createPetMotion({
    character: {
      clickActions: ["turnHead"],
      speed: 100,
      trackingAction: "turnHead",
      visual: {
        contentHeight: 180,
        footAnchor: { x: 96, y: 202 },
      },
    },
    cursorPosition: () => cursor,
    initialPosition: { x: 100, y: 100 },
    onStateChange() {},
    scale: 1,
    window: {
      getBounds() {
        return { x: 100, y: 100, width: 200, height: 200 };
      },
      getPosition() {
        return [100, 100];
      },
      setPosition() {},
      workAreaAt() {
        return { x: 0, y: 0, width: 1_920, height: 1_040 };
      },
    },
  });

  motion.click();
  motion.tick(16);
  assert.equal(motion.getState().lookDirection, "up");

  cursor = { x: 400, y: 200 };
  motion.tick(16);
  assert.equal(motion.getState().lookDirection, "right");
});
