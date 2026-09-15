import { contextBridge, ipcRenderer } from "electron";

import type { TodoDeadlinePrecision, TodoItem } from "../shared/types";
import { memoChannels } from "../shared/channels.ts";

export const desktopMemoBridge = {
  list(): Promise<TodoItem[]> {
    return ipcRenderer.invoke(memoChannels.list);
  },
  create(text: string): Promise<TodoItem> {
    return ipcRenderer.invoke(memoChannels.create, text);
  },
  updateText(id: string, text: string): Promise<TodoItem> {
    return ipcRenderer.invoke(memoChannels.updateText, id, text);
  },
  updateDeadline(
    id: string,
    deadline?: string,
    deadlinePrecision?: TodoDeadlinePrecision,
  ): Promise<TodoItem> {
    return ipcRenderer.invoke(
      memoChannels.updateDeadline,
      id,
      deadline,
      deadlinePrecision,
    );
  },
  complete(id: string): Promise<TodoItem> {
    return ipcRenderer.invoke(memoChannels.complete, id);
  },
  remove(id: string): Promise<void> {
    return ipcRenderer.invoke(memoChannels.remove, id);
  },
};

contextBridge.exposeInMainWorld("desktopMemo", desktopMemoBridge);
