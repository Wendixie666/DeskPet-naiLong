import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export interface SafeStorageAdapter {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}

export interface AiCredentialStore {
  has(): boolean;
  read(): string;
  remove(): void;
  save(apiKey: string): void;
}

export function createAiCredentialStore(
  filePath: string,
  safeStorage: SafeStorageAdapter,
): AiCredentialStore {
  function ensureAvailable(): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("系统安全存储不可用，无法保存 API Key");
    }
  }

  return {
    has() {
      return existsSync(filePath);
    },

    read() {
      if (!existsSync(filePath)) {
        throw new Error("API Key 未配置");
      }
      try {
        return safeStorage.decryptString(readFileSync(filePath));
      } catch {
        throw new Error("API Key 读取失败，请重新保存");
      }
    },

    remove() {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    },

    save(apiKey) {
      const normalized = apiKey.trim();
      if (normalized.length === 0) {
        throw new Error("API Key 不能为空");
      }
      ensureAvailable();
      mkdirSync(path.dirname(filePath), { recursive: true });
      const temporaryPath = `${filePath}.tmp`;
      writeFileSync(temporaryPath, safeStorage.encryptString(normalized));
      renameSync(temporaryPath, filePath);
    },
  };
}
