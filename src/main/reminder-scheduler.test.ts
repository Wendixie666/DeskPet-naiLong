import assert from "node:assert/strict";
import test from "node:test";

import type { TodoItem } from "../shared/types.ts";
import { createReminderScheduler } from "./reminder-scheduler.ts";

function todo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: "todo-1",
    text: "完成论文修改",
    completed: false,
    deadline: "2026-09-15T14:00:00.000Z",
    deadlinePrecision: "date-time",
    createdAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-09-15T10:00:00.000Z",
    ...overrides,
  };
}

test("ReminderScheduler 到期后只触发一次并记录提醒时间", () => {
  let currentTime = Date.parse("2026-09-15T14:00:00.000Z");
  let item = todo();
  const reminders: TodoItem[] = [];
  const scheduler = createReminderScheduler({
    store: {
      list: () => [item],
      markReminderTriggered(id, triggeredAt) {
        assert.equal(id, item.id);
        item = { ...item, reminderTriggeredAt: triggeredAt };
        return item;
      },
    },
    now: () => currentTime,
    onReminder: (remindedTodo) => reminders.push(remindedTodo),
  });

  scheduler.check();
  scheduler.check();
  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].reminderTriggeredAt, "2026-09-15T14:00:00.000Z");

  currentTime += 60_000;
  scheduler.check();
  assert.equal(reminders.length, 1);
});

test("ReminderScheduler 不提醒已完成任务，没有 DDL 的任务或未来任务", () => {
  const reminders: TodoItem[] = [];
  const items = [
    todo({ id: "completed", completed: true }),
    todo({ id: "without-deadline", deadline: undefined, deadlinePrecision: undefined }),
    todo({ id: "future", deadline: "2026-09-15T15:00:00.000Z" }),
  ];
  const scheduler = createReminderScheduler({
    store: {
      list: () => items,
      markReminderTriggered: () => items[0],
    },
    now: () => Date.parse("2026-09-15T14:00:00.000Z"),
    onReminder: (item) => reminders.push(item),
  });

  scheduler.check();
  assert.deepEqual(reminders, []);
});

test("ReminderScheduler 启动检查时会补触发已经错过的 DDL", () => {
  let item = todo({ deadline: "2026-09-15T14:00:00.000Z" });
  const reminders: TodoItem[] = [];
  const scheduler = createReminderScheduler({
    store: {
      list: () => [item],
      markReminderTriggered(_id, triggeredAt) {
        item = { ...item, reminderTriggeredAt: triggeredAt };
        return item;
      },
    },
    now: () => Date.parse("2026-09-15T15:00:00.000Z"),
    onReminder: (remindedTodo) => reminders.push(remindedTodo),
  });

  scheduler.start();
  scheduler.stop();
  assert.equal(reminders.length, 1);
});
