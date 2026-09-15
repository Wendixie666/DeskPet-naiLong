import type { TodoItem } from "../shared/types";

export interface ReminderSchedulerStore {
  list(): TodoItem[];
  markReminderTriggered(id: string, triggeredAt: string): TodoItem;
}

export interface ReminderSchedulerOptions {
  store: ReminderSchedulerStore;
  onReminder: (todo: TodoItem) => void;
  now?: () => number;
  intervalMs?: number;
}

export interface ReminderScheduler {
  check(): void;
  start(): void;
  stop(): void;
}

export const REMINDER_CHECK_INTERVAL_MS = 30_000;

export function createReminderScheduler(
  options: ReminderSchedulerOptions,
): ReminderScheduler {
  const now = options.now ?? Date.now;
  const intervalMs = options.intervalMs ?? REMINDER_CHECK_INTERVAL_MS;
  let timer: ReturnType<typeof setInterval> | undefined;

  function check(): void {
    const currentTime = now();
    for (const todo of options.store.list()) {
      if (todo.completed || !todo.deadline || todo.reminderTriggeredAt) {
        continue;
      }
      const deadlineTime = Date.parse(todo.deadline);
      if (!Number.isFinite(deadlineTime) || deadlineTime > currentTime) {
        continue;
      }
      const remindedTodo = options.store.markReminderTriggered(
        todo.id,
        new Date(currentTime).toISOString(),
      );
      options.onReminder(remindedTodo);
    }
  }

  return {
    check,

    start() {
      if (timer) {
        return;
      }
      check();
      timer = setInterval(check, intervalMs);
    },

    stop() {
      if (!timer) {
        return;
      }
      clearInterval(timer);
      timer = undefined;
    },
  };
}
