import { contextBridge, ipcRenderer } from "electron";

import type { AppSettings, SettingsSnapshot } from "../shared/types";
import { settingsChannels } from "../shared/channels.ts";

contextBridge.exposeInMainWorld("desktopSettings", {
  get(): Promise<SettingsSnapshot> {
    return ipcRenderer.invoke(settingsChannels.get);
  },
  update(settings: AppSettings): Promise<SettingsSnapshot> {
    return ipcRenderer.invoke(settingsChannels.update, settings);
  },
});
