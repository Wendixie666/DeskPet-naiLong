import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createPersonaLoader } from "./persona-loader.ts";

test("Persona Loader 读取角色 Markdown 全文", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "deskpet-persona-"));
  const filePath = path.join(directory, "naiwa.md");
  writeFileSync(filePath, "# 性格\n\n活泼的奶蛙。\n", "utf8");

  try {
    assert.equal(createPersonaLoader(directory).load("naiwa.md"), "# 性格\n\n活泼的奶蛙。\n");
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("Persona Loader 拒绝越过人设目录读取文件", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "deskpet-persona-"));
  try {
    assert.throws(() => createPersonaLoader(directory).load("../secret.md"), /人设文件无效/);
  } finally {
    rmSync(directory, { recursive: true });
  }
});
