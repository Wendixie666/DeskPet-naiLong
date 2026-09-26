import { contextBridge, ipcRenderer } from "electron";

import type {
  SettingsSaveRequest,
  SettingsSaveResult,
  SettingsSnapshot,
} from "../shared/types";
import { settingsChannels } from "../shared/channels.ts";

export const desktopSettingsBridge = {
  get(): Promise<SettingsSnapshot> {
    return ipcRenderer.invoke(settingsChannels.get);
  },
  save(request: SettingsSaveRequest): Promise<SettingsSaveResult> {
    return ipcRenderer.invoke(settingsChannels.save, request);
  },
};

contextBridge.exposeInMainWorld("desktopSettings", desktopSettingsBridge);
