import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createTodoStore } from "./todo-store.ts";

test("TodoStore 持久化任务并支持文本、DDL、完成和删除", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "deskpet-todos-"));
  const filePath = path.join(directory, "todos.json");

  try {
    const store = createTodoStore(filePath, () => "todo-1", () => "2026-09-15T10:00:00.000Z");
    const todo = store.create("完成论文修改");
    assert.deepEqual(todo, {
      id: "todo-1",
      text: "完成论文修改",
      completed: false,
      createdAt: "2026-09-15T10:00:00.000Z",
      updatedAt: "2026-09-15T10:00:00.000Z",
    });

    store.updateText(todo.id, "完成论文终稿");
    store.updateDeadline(todo.id, "2026-09-16T12:00:00.000Z", "date-time");
    assert.equal(store.list()[0].text, "完成论文终稿");
    assert.equal(store.list()[0].deadline, "2026-09-16T12:00:00.000Z");

    store.complete(todo.id);
    assert.equal(store.list()[0]?.completed, true);
    store.remove(todo.id);
    assert.deepEqual(store.list(), []);
    assert.doesNotThrow(() => JSON.parse(readFileSync(filePath, "utf8")));
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("TodoStore 修改 DDL 会清除旧提醒状态，其他修改会保留它", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "deskpet-todos-"));
  const filePath = path.join(directory, "todos.json");

  try {
    const store = createTodoStore(filePath, () => "todo-1", () => "2026-09-15T10:00:00.000Z");
    const todo = store.create("任务", "2026-09-16T12:00:00.000Z", "date-time");
    store.markReminderTriggered(todo.id, "2026-09-16T12:01:00.000Z");
    store.updateText(todo.id, "新任务");
    assert.equal(store.list()[0].reminderTriggeredAt, "2026-09-16T12:01:00.000Z");

    store.updateDeadline(todo.id, "2026-09-17T12:00:00.000Z", "date-time");
    assert.equal(store.list()[0].reminderTriggeredAt, undefined);
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("TodoStore 重启后仍能读取活动任务并按 DDL 排序", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "deskpet-todos-"));
  const filePath = path.join(directory, "todos.json");

  try {
    let nextId = 1;
    const first = createTodoStore(
      filePath,
      () => `todo-${nextId++}`,
      () => "2026-09-15T10:00:00.000Z",
    );
    first.create("无 DDL");
    first.create("较晚", "2026-09-18T12:00:00.000Z", "date-time");
    first.create("较早", "2026-09-16T12:00:00.000Z", "date-time");
    const completed = first.create("已完成", "2026-09-15T12:00:00.000Z", "date-time");
    first.complete(completed.id);

    const second = createTodoStore(filePath, () => "unused", () => "2026-09-15T10:00:00.000Z");
    assert.deepEqual(
      second.list().filter((todo) => !todo.completed).map((todo) => todo.text),
      ["较早", "较晚", "无 DDL"],
    );
  } finally {
    rmSync(directory, { recursive: true });
  }
});
