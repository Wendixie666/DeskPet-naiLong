import assert from "node:assert/strict";
import test from "node:test";

import { naiwa } from "../characters/naiwa.ts";
import type { Bounds, PetSnapshot, Point } from "../shared/types.ts";
import { createPetRuntime, type PetRuntimeWindow } from "./pet-runtime.ts";

function createWindow(initialPosition: Point): PetRuntimeWindow & {
  bounds: Bounds;
  snapshotCount: number;
} {
  const window: PetRuntimeWindow & { bounds: Bounds; snapshotCount: number } = {
    bounds: { ...initialPosition, ...naiwa.size },
    snapshotCount: 0,
    getBounds() {
      return { ...this.bounds };
    },
    getPosition() {
      return [this.bounds.x, this.bounds.y];
    },
    setBounds(bounds) {
      this.bounds = { ...bounds };
    },
    setPosition(x, y) {
      this.bounds.x = x;
      this.bounds.y = y;
    },
    workAreaAt() {
      return { x: 0, y: 0, width: 1_920, height: 1_080 };
    },
  };
  return window;
}

function createRuntime(
  window: PetRuntimeWindow,
  snapshots: PetSnapshot[],
) {
  return createPetRuntime({
    character: naiwa,
    cursorPosition: () => ({ x: 0, y: 0 }),
    initialPosition: { x: 100, y: 200 },
    onSnapshotChange(snapshot) {
      snapshots.push(snapshot);
    },
    onStateChange() {},
    scale: 1,
    window,
  });
}

test("运行编排 module 初始化并转发桌宠输入", () => {
  const snapshots: PetSnapshot[] = [];
  const runtimeWindow = createWindow({ x: 100, y: 200 });
  const runtime = createRuntime(runtimeWindow, snapshots);

  assert.equal(runtime.getSnapshot().character.id, "naiwa");
  assert.equal(runtime.getSnapshot().state.position.x, 100);
  runtime.click();
  runtime.dragBy(20, 30);

  assert.equal(runtime.getSnapshot().state.position.x, 120);
  assert.equal(runtime.getSnapshot().state.position.y, 230);
  assert.equal(snapshots.length, 1);
});

test("运行编排 module 切换角色或缩放时保持脚底位置并更新 snapshot", () => {
  const snapshots: PetSnapshot[] = [];
  const runtimeWindow = createWindow({ x: 100, y: 200 });
  const runtime = createRuntime(runtimeWindow, snapshots);

  runtime.applyCharacter(naiwa, 1.5);

  assert.equal(runtime.getScale(), 1.5);
  assert.equal(runtimeWindow.bounds.width, Math.round(naiwa.size.width * 1.5));
  assert.equal(runtimeWindow.bounds.height, Math.round(naiwa.size.height * 1.5));
  assert.equal(snapshots.length, 2);
  assert.equal(runtime.getSnapshot().character.id, "naiwa");
});
