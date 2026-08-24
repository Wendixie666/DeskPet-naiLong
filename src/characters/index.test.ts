import assert from "node:assert/strict";
import test from "node:test";

import { CharacterRegistry } from "./index.ts";
import { naiwa } from "./naiwa.ts";

const registry = new CharacterRegistry([naiwa], naiwa.id);

test("CharacterRegistry 根据 id 提供角色，无效 id 回退默认角色", () => {
  assert.equal(registry.get("naiwa").id, "naiwa");
  assert.equal(registry.get("missing").id, naiwa.id);
});

test("CharacterRegistry 提供设置页需要的角色摘要", () => {
  assert.deepEqual(registry.list(), [{ id: "naiwa", name: "奶蛙" }]);
});

test("CharacterRegistry 拒绝缺少通用动作的角色配置", () => {
  assert.throws(
    () => new CharacterRegistry([{
      ...naiwa,
      actions: { wave: naiwa.actions.wave },
      clickActions: ["wave"],
    }], naiwa.id),
    /idle.*walk/,
  );
});

test("CharacterRegistry 拒绝空点击动作或未配置的点击动作", () => {
  assert.throws(
    () => new CharacterRegistry([{ ...naiwa, clickActions: [] }], naiwa.id),
    /点击动作/,
  );
  assert.throws(
    () => new CharacterRegistry([{
      ...naiwa,
      clickActions: ["missing"],
    }], naiwa.id),
    /missing/,
  );
});
