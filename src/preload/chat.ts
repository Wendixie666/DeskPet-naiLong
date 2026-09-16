import { contextBridge, ipcRenderer } from "electron";

import type { AppTheme, ChatState, SettingsSnapshot } from "../shared/types";
import { chatChannels, settingsChannels } from "../shared/channels.ts";

export const desktopChatBridge = {
  getState(): Promise<ChatState> {
    return ipcRenderer.invoke(chatChannels.getState);
  },
  send(content: string): Promise<void> {
    return ipcRenderer.invoke(chatChannels.send, content);
  },
  cancel(): void {
    ipcRenderer.send(chatChannels.cancel);
  },
  clear(): Promise<ChatState> {
    return ipcRenderer.invoke(chatChannels.clear);
  },
  getTheme(): Promise<AppTheme> {
    return ipcRenderer.invoke(settingsChannels.get).then(
      (snapshot: SettingsSnapshot) => snapshot.settings.theme,
    );
  },
  onThemeChanged(listener: (theme: AppTheme) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, theme: AppTheme) => listener(theme);
    ipcRenderer.on(settingsChannels.themeChanged, handler);
    return () => ipcRenderer.removeListener(settingsChannels.themeChanged, handler);
  },
  onDelta(listener: (delta: string) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, delta: string) => listener(delta);
    ipcRenderer.on(chatChannels.delta, handler);
    return () => ipcRenderer.removeListener(chatChannels.delta, handler);
  },
  onDone(listener: (state: ChatState) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, state: ChatState) => listener(state);
    ipcRenderer.on(chatChannels.done, handler);
    return () => ipcRenderer.removeListener(chatChannels.done, handler);
  },
  onError(listener: (message: string, state: ChatState) => void): () => void {
    const handler = (
      _event: Electron.IpcRendererEvent,
      message: string,
      state: ChatState,
    ) => listener(message, state);
    ipcRenderer.on(chatChannels.error, handler);
    return () => ipcRenderer.removeListener(chatChannels.error, handler);
  },
};

contextBridge.exposeInMainWorld("desktopChat", desktopChatBridge);
