import { contextBridge, ipcRenderer } from "electron";

import type {
  AppTheme,
  TodoDeadlinePrecision,
  TodoItem,
} from "../shared/types";
import { memoChannels, settingsChannels } from "../shared/channels.ts";

export const desktopMemoBridge = {
  getTheme(): Promise<AppTheme> {
    return ipcRenderer.invoke(settingsChannels.get).then(
      (snapshot: { settings: { theme: AppTheme } }) => snapshot.settings.theme,
    );
  },
  onThemeChanged(listener: (theme: AppTheme) => void): () => void {
    const handler = (_event: unknown, theme: AppTheme) => listener(theme);
    ipcRenderer.on(settingsChannels.themeChanged, handler);
    return () => ipcRenderer.removeListener(settingsChannels.themeChanged, handler);
  },
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
