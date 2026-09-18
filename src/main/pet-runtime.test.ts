import assert from "node:assert/strict";
import test from "node:test";

import { naiwa } from "../characters/naiwa.ts";
import type {
  Bounds,
  PetSnapshot,
  PetState,
  Point,
  SystemWindow,
  TodoItem,
} from "../shared/types.ts";
import { createPetRuntime, type PetRuntimeWindow } from "./pet-runtime.ts";
import type { WindowQuery } from "./window-query.ts";

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
  onReminderChange?: (todo?: TodoItem) => void,
  windowQuery?: WindowQuery,
) {
  return createPetRuntime({
    character: naiwa,
    cursorPosition: () => ({ x: 0, y: 0 }),
    initialPosition: { x: 100, y: 200 },
    onSnapshotChange(snapshot) {
      snapshots.push(snapshot);
    },
    onReminderChange,
    onStateChange() {},
    scale: 1,
    windowQuery,
    window,
  });
}

function createWindowQuery(target: SystemWindow): {
  query: WindowQuery;
  setTarget(nextTarget: SystemWindow | undefined): void;
  boundsCalls: number;
} {
  let currentTarget: SystemWindow | undefined = target;
  const result = {
    boundsCalls: 0,
    query: {
      async getWindowBounds(id: string) {
        result.boundsCalls += 1;
        return currentTarget?.id === id ? currentTarget : undefined;
      },
      async listWindows() {
        return currentTarget ? [currentTarget] : [];
      },
    } as WindowQuery,
    setTarget(nextTarget: SystemWindow | undefined) {
      currentTarget = nextTarget;
    },
  };
  return result;
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

test("运行编排 module 转发键盘活动到桌宠运动", () => {
  const snapshots: PetSnapshot[] = [];
  const runtime = createRuntime(createWindow({ x: 100, y: 200 }), snapshots);

  runtime.keyboardActivity();

  assert.equal(runtime.getSnapshot().state.action, "typing");
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

test("运行编排 module 按 tickMs 自驱推进桌宠运动并在 dispose 后停止", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const states: PetState[] = [];
  const runtime = createPetRuntime({
    character: naiwa,
    cursorPosition: () => ({ x: 0, y: 0 }),
    initialPosition: { x: 100, y: 200 },
    onSnapshotChange() {},
    onStateChange(state) {
      states.push(state);
    },
    scale: 1,
    tickMs: 16,
    window: createWindow({ x: 100, y: 200 }),
  });

  runtime.summon({ x: 300, y: 400 });
  t.mock.timers.tick(16);
  const tickCount = states.length;
  assert.ok(tickCount > 0);

  runtime.dispose();
  t.mock.timers.tick(160);
  assert.equal(states.length, tickCount);
});

test("运行编排 module 触发提醒并在展示时间结束后回到 idle", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const snapshots: PetSnapshot[] = [];
  const reminders: Array<TodoItem | undefined> = [];
  const runtime = createRuntime(
    createWindow({ x: 100, y: 200 }),
    snapshots,
    (todo) => reminders.push(todo),
  );
  const todo: TodoItem = {
    id: "todo-1",
    text: "改论文",
    completed: false,
    createdAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-09-15T10:00:00.000Z",
  };

  assert.equal(runtime.triggerReminder(todo), true);
  assert.equal(runtime.getSnapshot().state.action, "reminder");
  assert.deepEqual(reminders, [todo]);

  t.mock.timers.tick(6_999);
  assert.equal(runtime.getSnapshot().state.action, "reminder");
  t.mock.timers.tick(1);

  assert.equal(runtime.getSnapshot().state.action, "idle");
  assert.deepEqual(reminders, [todo, undefined]);
});

test("运行编排 module 可以提前关闭提醒并保持 Todo 未完成", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const reminders: Array<TodoItem | undefined> = [];
  const runtime = createRuntime(
    createWindow({ x: 100, y: 200 }),
    [],
    (todo) => reminders.push(todo),
  );
  const todo: TodoItem = {
    id: "todo-2",
    text: "读文档",
    completed: false,
    createdAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-09-15T10:00:00.000Z",
  };

  runtime.triggerReminder(todo);
  runtime.dismissReminder();

  assert.equal(runtime.getSnapshot().state.action, "idle");
  assert.deepEqual(reminders, [todo, undefined]);
});

test("拖拽释放在窗口顶部进入 windowPerch，目标 bounds 改变后退出", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const target: SystemWindow = {
    id: "window-1",
    bounds: { x: 250, y: 382, width: 800, height: 600 },
    isMinimized: false,
    isOrdinary: true,
  };
  const query = createWindowQuery(target);
  const runtimeWindow = createWindow({ x: 300, y: 180 });
  const runtime = createRuntime(runtimeWindow, [], undefined, query.query);

  runtime.dragBy(0, 0);
  runtime.endDrag();
  await Promise.resolve();

  assert.equal(runtime.getSnapshot().state.action, "windowPerch");
  assert.deepEqual(runtimeWindow.bounds, {
    x: 554,
    y: 262,
    width: 192,
    height: 208,
  });

  query.setTarget({
    ...target,
    bounds: { ...target.bounds, width: 801 },
  });
  t.mock.timers.tick(150);
  await Promise.resolve();
  assert.equal(runtime.getSnapshot().state.action, "idle");
  assert.equal(query.boundsCalls, 1);
});

test("用户再次拖动停靠桌宠时立即退出 windowPerch", async () => {
  const target: SystemWindow = {
    id: "window-2",
    bounds: { x: 250, y: 382, width: 800, height: 600 },
    isMinimized: false,
    isOrdinary: true,
  };
  const query = createWindowQuery(target);
  const runtime = createRuntime(
    createWindow({ x: 300, y: 180 }),
    [],
    undefined,
    query.query,
  );

  runtime.dragBy(0, 0);
  runtime.endDrag();
  await Promise.resolve();
  runtime.dragBy(10, 5);

  assert.equal(runtime.getSnapshot().state.action, "drag");
});
