import {
  type AiConfigStore,
  validateAiConfig,
} from "../ai/ai-config.ts";
import type { AiCredentialStore } from "../ai/ai-credential-store.ts";
import type {
  AiConnectionTestResult,
  AiSettingsSnapshot,
} from "../shared/types.ts";
import { aiSettingsChannels } from "../shared/channels.ts";

export interface AiSettingsIpcHandlers {
  get(): AiSettingsSnapshot;
  update(value: unknown): AiSettingsSnapshot;
  saveApiKey(apiKey: string): AiSettingsSnapshot;
  removeApiKey(): AiSettingsSnapshot;
  test(config?: unknown, apiKey?: string): Promise<AiConnectionTestResult>;
}

interface IpcRegistrar {
  handle(channel: string, listener: (...args: any[]) => unknown): void;
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

function connectionError(status: number): string {
  if (status === 400) {
    return "模型不存在或请求参数错误";
  }
  if (status === 401) {
    return "API Key 无效";
  }
  if (status === 403) {
    return "API Key 无效或没有权限";
  }
  if (status === 404) {
    return "Base URL 或接口路径错误";
  }
  if (status === 429) {
    return "请求过于频繁，请稍后再试";
  }
  if (status >= 500) {
    return "AI 服务暂时不可用，请稍后再试";
  }
  return `请求失败（HTTP ${status}）`;
}

export function createAiSettingsIpcHandlers(
  configStore: AiConfigStore,
  credentialStore: AiCredentialStore,
  request: FetchLike,
): AiSettingsIpcHandlers {
  function get(): AiSettingsSnapshot {
    return {
      config: configStore.load(),
      hasApiKey: credentialStore.has(),
    };
  }

  return {
    get,

    update(value) {
      configStore.save(value);
      return get();
    },

    saveApiKey(apiKey) {
      credentialStore.save(apiKey);
      return get();
    },

    removeApiKey() {
      credentialStore.remove();
      return get();
    },

    async test(value, apiKey) {
      let config;
      try {
        config = validateAiConfig(value === undefined ? configStore.load() : value);
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : "AI 配置无效",
        };
      }

      let key: string;
      try {
        key = apiKey?.trim() || credentialStore.read();
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : "API Key 未配置",
        };
      }

      try {
        const response = await request(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: "user", content: "请只回复：连接成功" }],
            stream: false,
          }),
        });
        if (response.ok) {
          return { ok: true, message: "连接成功" };
        }
        return { ok: false, message: connectionError(response.status) };
      } catch {
        return { ok: false, message: "网络连接失败，请检查 Base URL 和网络" };
      }
    },
  };
}

export function registerAiSettingsIpc(
  ipc: IpcRegistrar,
  handlers: AiSettingsIpcHandlers,
): void {
  ipc.handle(aiSettingsChannels.get, () => handlers.get());
  ipc.handle(aiSettingsChannels.update, (_event, value: unknown) => handlers.update(value));
  ipc.handle(
    aiSettingsChannels.saveApiKey,
    (_event, apiKey: string) => handlers.saveApiKey(apiKey),
  );
  ipc.handle(aiSettingsChannels.removeApiKey, () => handlers.removeApiKey());
  ipc.handle(
    aiSettingsChannels.test,
    (_event, config: unknown, apiKey: string | undefined) => handlers.test(config, apiKey),
  );
}
