import { contextBridge, ipcRenderer } from "electron";

import type { AppSettings, SettingsSnapshot } from "../shared/types";

contextBridge.exposeInMainWorld("desktopSettings", {
  get(): Promise<SettingsSnapshot> {
    return ipcRenderer.invoke("settings:get");
  },
  update(settings: AppSettings): Promise<SettingsSnapshot> {
    return ipcRenderer.invoke("settings:update", settings);
  },
});
