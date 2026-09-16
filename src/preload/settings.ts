import { contextBridge, ipcRenderer } from "electron";

import type {
  AiConfig,
  AiConnectionTestResult,
  AiSettingsSnapshot,
  AppSettings,
  SettingsSnapshot,
} from "../shared/types";
import { aiSettingsChannels, settingsChannels } from "../shared/channels.ts";

contextBridge.exposeInMainWorld("desktopSettings", {
  get(): Promise<SettingsSnapshot> {
    return ipcRenderer.invoke(settingsChannels.get);
  },
  update(settings: AppSettings): Promise<SettingsSnapshot> {
    return ipcRenderer.invoke(settingsChannels.update, settings);
  },
  getAiSettings(): Promise<AiSettingsSnapshot> {
    return ipcRenderer.invoke(aiSettingsChannels.get);
  },
  updateAiSettings(config: AiConfig): Promise<AiSettingsSnapshot> {
    return ipcRenderer.invoke(aiSettingsChannels.update, config);
  },
  saveApiKey(apiKey: string): Promise<AiSettingsSnapshot> {
    return ipcRenderer.invoke(aiSettingsChannels.saveApiKey, apiKey);
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
});
