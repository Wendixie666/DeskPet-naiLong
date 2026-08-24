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

test("拖拽取消召唤，点击从角色动作中选择状态", () => {
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
    random: () => 0.75,
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

  assert.deepEqual(position, [120, 170]);
  assert.equal(motion.getState().isMoving, false);
  assert.equal(motion.getState().action, "heart");
  assert.deepEqual(states, ["walk", "idle", "heart"]);
});
