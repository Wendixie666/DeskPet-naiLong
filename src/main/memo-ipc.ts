import type { TodoDeadlinePrecision, TodoItem } from "../shared/types";
import { memoChannels } from "../shared/channels.ts";
import type { TodoStore } from "./todo-store.ts";

export interface MemoIpcHandlers {
  list(): TodoItem[];
  create(text: string): TodoItem;
  updateText(id: string, text: string): TodoItem;
  updateDeadline(
    id: string,
    deadline?: string,
    deadlinePrecision?: TodoDeadlinePrecision,
  ): TodoItem;
  complete(id: string): TodoItem;
  remove(id: string): void;
}

interface IpcRegistrar {
  handle(channel: string, listener: (...args: any[]) => unknown): void;
}

export function createMemoIpcHandlers(store: TodoStore): MemoIpcHandlers {
  return {
    list: () => store.list(),
    create: (text) => store.create(text),
    updateText: (id, text) => store.updateText(id, text),
    updateDeadline: (id, deadline, deadlinePrecision) => (
      store.updateDeadline(id, deadline, deadlinePrecision)
    ),
    complete: (id) => store.complete(id),
    remove: (id) => store.remove(id),
  };
}

export function registerMemoIpc(
  ipc: IpcRegistrar,
  handlers: MemoIpcHandlers,
): void {
  ipc.handle(memoChannels.list, () => handlers.list());
  ipc.handle(memoChannels.create, (_event, text: string) => handlers.create(text));
  ipc.handle(
    memoChannels.updateText,
    (_event, id: string, text: string) => handlers.updateText(id, text),
  );
  ipc.handle(
    memoChannels.updateDeadline,
    (_event, id: string, deadline: string | undefined, precision: TodoDeadlinePrecision | undefined) => (
      handlers.updateDeadline(id, deadline, precision)
    ),
  );
  ipc.handle(memoChannels.complete, (_event, id: string) => handlers.complete(id));
  ipc.handle(memoChannels.remove, (_event, id: string) => handlers.remove(id));
}
