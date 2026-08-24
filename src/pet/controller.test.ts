import assert from "node:assert/strict";
import test from "node:test";

import { createPetController } from "./controller.ts";

test("点击会从角色候选动作中切换状态", () => {
  const pet = createPetController({
    clickActions: ["wave", "heart"],
    initialPosition: { x: 100, y: 200 },
    random: () => 0.75,
    speed: 200,
    size: { width: 192, height: 208 },
  });

  const state = pet.click();

  assert.equal(state.action, "heart");
});

test("summon 朝目标行走并根据水平方向改变朝向", () => {
  const pet = createPetController({
    clickActions: ["wave"],
    initialPosition: { x: 100, y: 200 },
    speed: 100,
    size: { width: 100, height: 100 },
  });

  pet.summon(350, 300);
  const state = pet.tick(500);

  assert.equal(state.action, "walk");
  assert.equal(state.facing, "right");
  assert.deepEqual(state.position, { x: 150, y: 200 });
});

test("summon 到达目标后恢复 idle，目标点表示角色脚底中心", () => {
  const pet = createPetController({
    clickActions: ["wave"],
    initialPosition: { x: 300, y: 300 },
    speed: 200,
    size: { width: 100, height: 100 },
  });

  pet.summon(100, 200);
  const state = pet.tick(2_000);

  assert.equal(state.action, "idle");
  assert.equal(state.facing, "left");
  assert.deepEqual(state.position, { x: 50, y: 100 });
  assert.equal(state.isMoving, false);
});

test("拖拽会取消尚未完成的 summon", () => {
  const pet = createPetController({
    clickActions: ["wave"],
    initialPosition: { x: 100, y: 200 },
    speed: 100,
    size: { width: 100, height: 100 },
  });

  pet.summon(500, 500);
  const state = pet.moveTo(20, 30);

  assert.deepEqual(state.position, { x: 20, y: 30 });
  assert.equal(state.action, "idle");
  assert.equal(state.isMoving, false);
});
