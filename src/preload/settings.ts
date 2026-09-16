import { contextBridge, ipcRenderer } from "electron";

import type {
  AiConfig,
  AiConnectionTestResult,
  AiSettingsSnapshot,
  SettingsSaveRequest,
  SettingsSaveResult,
  SettingsSnapshot,
} from "../shared/types";
import { aiSettingsChannels, settingsChannels } from "../shared/channels.ts";

export const desktopSettingsBridge = {
  get(): Promise<SettingsSnapshot> {
    return ipcRenderer.invoke(settingsChannels.get);
  },
  save(request: SettingsSaveRequest): Promise<SettingsSaveResult> {
    return ipcRenderer.invoke(settingsChannels.save, request);
  },
  getAiSettings(): Promise<AiSettingsSnapshot> {
    return ipcRenderer.invoke(aiSettingsChannels.get);
  },
  removeApiKey(): Promise<AiSettingsSnapshot> {
    return ipcRenderer.invoke(aiSettingsChannels.removeApiKey);
  },
  testAiConnection(
    config: AiConfig,
    apiKey?: string,
  ): Promise<AiConnectionTestResult> {
    return ipcRenderer.invoke(aiSettingsChannels.test, config, apiKey);
  },
};

contextBridge.exposeInMainWorld("desktopSettings", desktopSettingsBridge);
