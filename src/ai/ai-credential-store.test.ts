import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createAiCredentialStore } from "./ai-credential-store.ts";

test("凭据存储支持保存、判断、读取和删除", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "deskpet-ai-key-"));
  const filePath = path.join(directory, "api-key.bin");
  const store = createAiCredentialStore(filePath, {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(
      Buffer.from(value, "utf8").toString("base64url"),
      "utf8",
    ),
    decryptString: (value) => Buffer.from(value.toString("utf8"), "base64url")
      .toString("utf8"),
  });

  try {
    assert.equal(store.has(), false);
    assert.throws(() => store.read(), /API Key 未配置/);

    store.save("  sk-test-secret  ");
    assert.equal(store.has(), true);
    assert.equal(store.read(), "sk-test-secret");
    assert.doesNotMatch(readFileSync(filePath, "utf8"), /sk-test-secret/);

    store.remove();
    assert.equal(store.has(), false);
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("安全存储不可用时拒绝保存 API Key", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "deskpet-ai-key-"));
  const filePath = path.join(directory, "api-key.bin");
  const store = createAiCredentialStore(filePath, {
    isEncryptionAvailable: () => false,
    encryptString: () => Buffer.from("unused"),
    decryptString: () => "unused",
  });

  try {
    assert.throws(() => store.save("sk-test-secret"), /系统安全存储不可用/);
    assert.equal(store.has(), false);
  } finally {
    rmSync(directory, { recursive: true });
  }
});
