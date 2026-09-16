import type {
  AiSettingsSnapshot,
  AppSettings,
  SettingsSaveRequest,
  SettingsSaveResult,
  SettingsSnapshot,
} from "../shared/types.ts";

interface SettingsUpdater {
  update(value: unknown): AppSettings;
}

interface AiSettingsWriter {
  get(): AiSettingsSnapshot;
  update(value: unknown): AiSettingsSnapshot;
  saveApiKey(apiKey: string): AiSettingsSnapshot;
}

export interface SettingsCoordinator {
  save(value: unknown): SettingsSaveResult;
}

function parseRequest(value: unknown): SettingsSaveRequest {
  if (!value || typeof value !== "object") {
    throw new Error("设置保存请求无效");
  }

  const candidate = value as {
    settings?: unknown;
    ai?: unknown;
  };
  if (candidate.settings === undefined) {
    throw new Error("设置保存请求无效");
  }
  if (candidate.ai === undefined) {
    return { settings: candidate.settings as AppSettings };
  }
  if (!candidate.ai || typeof candidate.ai !== "object") {
    throw new Error("AI 设置保存请求无效");
  }

  const ai = candidate.ai as {
    config?: unknown;
    apiKey?: unknown;
  };
  if (ai.apiKey !== undefined && typeof ai.apiKey !== "string") {
    throw new Error("AI 设置保存请求无效");
  }
  return {
    settings: candidate.settings as AppSettings,
    ai: {
      config: ai.config as NonNullable<SettingsSaveRequest["ai"]>["config"],
      apiKey: ai.apiKey,
    },
  };
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : "保存失败";
}

export function createSettingsCoordinator(
  settings: SettingsUpdater,
  aiSettings: AiSettingsWriter,
  getSettingsSnapshot: () => SettingsSnapshot,
  onAppSettingsApplied: (snapshot: SettingsSnapshot) => void,
): SettingsCoordinator {
  function result(
    ok: boolean,
    message: string,
    saved: { app: boolean; ai: boolean },
  ): SettingsSaveResult {
    return {
      ok,
      message,
      saved,
      settings: getSettingsSnapshot(),
      aiSettings: aiSettings.get(),
    };
  }

  return {
    save(value) {
      let request: SettingsSaveRequest;
      try {
        request = parseRequest(value);
      } catch (error) {
        return result(false, messageFor(error), { app: false, ai: false });
      }

      let aiSaved = false;
      let aiChanged = false;
      let appSaved = false;
      try {
        if (request.ai) {
          aiSettings.update(request.ai.config);
          aiChanged = true;
          if (request.ai.apiKey !== undefined) {
            aiSettings.saveApiKey(request.ai.apiKey);
          }
          aiSaved = true;
        }

        settings.update(request.settings);
        appSaved = true;
        const snapshot = getSettingsSnapshot();
        onAppSettingsApplied(snapshot);
        return result(true, "已保存", { app: true, ai: aiSaved });
      } catch (error) {
        const detail = messageFor(error);
        if (aiChanged && !aiSaved) {
          return result(false, `AI 设置部分保存失败：${detail}`, {
            app: false,
            ai: true,
          });
        }
        if (aiSaved && !appSaved) {
          return result(false, `AI 设置已保存，但桌宠设置保存失败：${detail}`, {
            app: false,
            ai: true,
          });
        }
        if (aiSaved) {
          return result(false, `AI 设置保存失败：${detail}`, {
            app: appSaved,
            ai: true,
          });
        }
        return result(false, `桌宠设置保存失败：${detail}`, {
          app: false,
          ai: false,
        });
      }
    },
  };
}
