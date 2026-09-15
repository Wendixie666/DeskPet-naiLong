import { contextBridge, ipcRenderer } from "electron";

import { reminderOverlayChannels } from "../shared/channels.ts";

export const desktopReminderOverlayBridge = {
  click(): void {
    ipcRenderer.send(reminderOverlayChannels.click);
  },
  onHide(listener: () => void): void {
    ipcRenderer.on(reminderOverlayChannels.hide, listener);
  },
  onShow(listener: (text: string) => void): void {
    ipcRenderer.on(reminderOverlayChannels.show, (_event, text: string) => listener(text));
  },
};

contextBridge.exposeInMainWorld("desktopReminderOverlay", desktopReminderOverlayBridge);
