import assert from "node:assert/strict";
import test from "node:test";

import { createChatService } from "../ai/chat-service.ts";
import { chatChannels } from "../shared/channels.ts";
import { createChatIpcHandlers, registerChatIpc } from "./chat-ipc.ts";

test("聊天 IPC 转发流式增量并在完成后返回状态", async () => {
  const service = createChatService({
    getCharacter: () => ({ id: "naiwa", name: "奶蛙", persona: { file: "naiwa.md" } }),
    getAiConfig: () => ({ provider: "openai-compatible", baseUrl: "https://example.com/v1", model: "model" }),
    getApiKey: () => "secret",
    loadPersona: () => "persona",
    createProvider: () => ({
      async *chat() {
        yield "你好";
        yield "呀";
      },
    }),
  });
  const events: Array<{ channel: string; args: unknown[] }> = [];
  const handlers = createChatIpcHandlers(service, () => "naiwa");

  await handlers.send({
    send(channel, ...args) {
      events.push({ channel, args });
    },
  }, "你好");

  assert.deepEqual(events.map((event) => event.channel), [
    chatChannels.delta,
    chatChannels.delta,
    chatChannels.done,
  ]);
  assert.deepEqual(events[2].args[0], service.getState("naiwa"));
});

test("注册聊天 IPC 的全部通道", () => {
  const handled: string[] = [];
  const listened: string[] = [];
  registerChatIpc({
    handle(channel: string) {
      handled.push(channel);
    },
    on(channel: string) {
      listened.push(channel);
    },
  }, {
    getState: () => ({ characterId: "naiwa", messages: [], generating: false }),
    send: async () => {},
    clear: () => ({ characterId: "naiwa", messages: [], generating: false }),
    cancel: () => {},
  });

  assert.deepEqual(handled.sort(), [chatChannels.getState, chatChannels.send, chatChannels.clear].sort());
  assert.deepEqual(listened.sort(), [chatChannels.cancel].sort());
});
