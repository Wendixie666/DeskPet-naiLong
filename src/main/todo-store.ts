import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import type {
  TodoDeadlinePrecision,
  TodoItem,
} from "../shared/types";

export interface TodoStore {
  list(): TodoItem[];
  create(
    text: string,
    deadline?: string,
    deadlinePrecision?: TodoDeadlinePrecision,
  ): TodoItem;
  updateText(id: string, text: string): TodoItem;
  updateDeadline(
    id: string,
    deadline?: string,
    deadlinePrecision?: TodoDeadlinePrecision,
  ): TodoItem;
  complete(id: string): TodoItem;
  remove(id: string): void;
  markReminderTriggered(id: string, triggeredAt: string): TodoItem;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && Number.isFinite(Date.parse(value));
}

function normalizeTodo(value: unknown): TodoItem | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Partial<TodoItem>;
  if (typeof candidate.id !== "string"
    || candidate.id.length === 0
    || typeof candidate.text !== "string"
    || candidate.text.trim().length === 0
    || typeof candidate.completed !== "boolean"
    || !isTimestamp(candidate.createdAt)
    || !isTimestamp(candidate.updatedAt)) {
    return undefined;
  }

  const todo: TodoItem = {
    id: candidate.id,
    text: candidate.text.trim(),
    completed: candidate.completed,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
  if (isTimestamp(candidate.deadline)) {
    todo.deadline = candidate.deadline;
    todo.deadlinePrecision = candidate.deadlinePrecision === "date"
      ? "date"
      : "date-time";
  }
  if (isTimestamp(candidate.reminderTriggeredAt)) {
    todo.reminderTriggeredAt = candidate.reminderTriggeredAt;
  }
  return todo;
}

function sortTodos(todos: TodoItem[]): TodoItem[] {
  return [...todos].sort((left, right) => {
    if (left.deadline && right.deadline) {
      return Date.parse(left.deadline) - Date.parse(right.deadline);
    }
    if (left.deadline) {
      return -1;
    }
    if (right.deadline) {
      return 1;
    }
    return Date.parse(left.createdAt) - Date.parse(right.createdAt);
  });
}

function copyTodo(todo: TodoItem): TodoItem {
  return { ...todo };
}

export function createTodoStore(
  filePath: string,
  createId: () => string = () => crypto.randomUUID(),
  now: () => string = () => new Date().toISOString(),
): TodoStore {
  let todos = loadTodos(filePath);

  function save(): void {
    mkdirSync(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(todos, null, 2)}\n`, "utf8");
    renameSync(temporaryPath, filePath);
  }

  function find(id: string): TodoItem {
    const todo = todos.find((item) => item.id === id);
    if (!todo) {
      throw new Error(`任务不存在：${id}`);
    }
    return todo;
  }

  function update(id: string, change: (todo: TodoItem) => void): TodoItem {
    const todo = find(id);
    const previous = copyTodo(todo);
    change(todo);
    todo.updatedAt = now();
    try {
      save();
    } catch (error) {
      Object.assign(todo, previous);
      throw error;
    }
    return copyTodo(todo);
  }

  return {
    list() {
      return sortTodos(todos).map(copyTodo);
    },

    create(text, deadline, deadlinePrecision) {
      const normalizedText = text.trim();
      if (!normalizedText) {
        throw new Error("任务内容不能为空");
      }
      const timestamp = now();
      const todo: TodoItem = {
        id: createId(),
        text: normalizedText,
        completed: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      if (deadline) {
        if (!isTimestamp(deadline)) {
          throw new Error("DDL 时间格式无效");
        }
        todo.deadline = deadline;
        todo.deadlinePrecision = deadlinePrecision ?? "date-time";
      }
      todos.push(todo);
      try {
        save();
      } catch (error) {
        todos.pop();
        throw error;
      }
      return copyTodo(todo);
    },

    updateText(id, text) {
      const normalizedText = text.trim();
      if (!normalizedText) {
        throw new Error("任务内容不能为空");
      }
      return update(id, (todo) => {
        todo.text = normalizedText;
      });
    },

    updateDeadline(id, deadline, deadlinePrecision) {
      if (deadline !== undefined && !isTimestamp(deadline)) {
        throw new Error("DDL 时间格式无效");
      }
      return update(id, (todo) => {
        if (todo.deadline !== deadline) {
          todo.reminderTriggeredAt = undefined;
        }
        todo.deadline = deadline;
        todo.deadlinePrecision = deadline
          ? deadlinePrecision ?? "date-time"
          : undefined;
      });
    },

    complete(id) {
      return update(id, (todo) => {
        todo.completed = true;
      });
    },

    remove(id) {
      find(id);
      const previous = todos;
      todos = todos.filter((todo) => todo.id !== id);
      try {
        save();
      } catch (error) {
        todos = previous;
        throw error;
      }
    },

    markReminderTriggered(id, triggeredAt) {
      return update(id, (todo) => {
        todo.reminderTriggeredAt = triggeredAt;
      });
    },
  };
}

function loadTodos(filePath: string): TodoItem[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((value) => {
      const todo = normalizeTodo(value);
      return todo ? [todo] : [];
    });
  } catch {
    return [];
  }
}
