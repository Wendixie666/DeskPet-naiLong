import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { AiConfig } from "../shared/types.ts";

export type { AiConfig } from "../shared/types.ts";

export const defaultAiConfig: AiConfig = {
  provider: "openai-compatible",
  baseUrl: "https://api.openai.com/v1",
  model: "",
};

export interface AiConfigStore {
  load(): AiConfig;
  save(value: unknown): AiConfig;
}

function isBaseUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeBaseUrl(value: unknown): string {
  if (!isBaseUrl(value)) {
    return defaultAiConfig.baseUrl;
  }
  return value.trim().replace(/\/+$/, "");
}

export function normalizeAiConfig(value: unknown): AiConfig {
  if (!value || typeof value !== "object") {
    return { ...defaultAiConfig };
  }

  const candidate = value as Partial<AiConfig>;
  return {
    provider: candidate.provider === "openai-compatible" || candidate.provider === "deepseek"
      ? candidate.provider
      : defaultAiConfig.provider,
    baseUrl: normalizeBaseUrl(candidate.baseUrl),
    model: typeof candidate.model === "string"
      ? candidate.model.trim()
      : defaultAiConfig.model,
  };
}

export function validateAiConfig(value: unknown): AiConfig {
  if (!value || typeof value !== "object") {
    throw new Error("AI 配置无效");
  }

  const candidate = value as Partial<AiConfig>;
  if (candidate.provider !== "openai-compatible" && candidate.provider !== "deepseek") {
    throw new Error("暂只支持 OpenAI Compatible 和 DeepSeek");
  }
  if (!isBaseUrl(candidate.baseUrl)) {
    throw new Error("Base URL 必须是有效的 HTTP 或 HTTPS 地址");
  }
  if (typeof candidate.model !== "string" || candidate.model.trim().length === 0) {
    throw new Error("Model 不能为空");
  }
  return normalizeAiConfig(candidate);
}

export function createAiConfigStore(filePath: string): AiConfigStore {
  return {
    load() {
      try {
        return normalizeAiConfig(JSON.parse(readFileSync(filePath, "utf8")));
      } catch {
        return { ...defaultAiConfig };
      }
    },

    save(value) {
      const normalized = validateAiConfig(value);
      mkdirSync(path.dirname(filePath), { recursive: true });
      const temporaryPath = `${filePath}.tmp`;
      writeFileSync(temporaryPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
      renameSync(temporaryPath, filePath);
      return normalized;
    },
  };
}
