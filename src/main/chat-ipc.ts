import type { ChatService } from "../ai/chat-service.ts";
import type { ChatState } from "../shared/types.ts";
import { chatChannels } from "../shared/channels.ts";

export interface ChatEventSender {
  send(channel: string, ...args: unknown[]): void;
}

export interface ChatIpcHandlers {
  getState(): ChatState;
  send(sender: ChatEventSender, content: string): Promise<void>;
  clear(): ChatState;
  cancel(): void;
}

interface IpcRegistrar {
  handle(channel: string, listener: (...args: any[]) => unknown): void;
  on(channel: string, listener: (...args: any[]) => void): void;
}

export function createChatIpcHandlers(
  service: ChatService,
  getCharacterId: () => string,
): ChatIpcHandlers {
  let activeController: AbortController | undefined;

  return {
    getState() {
      return service.getState(getCharacterId());
    },

    async send(sender, content) {
      if (activeController) {
        throw new Error("上一条消息仍在生成");
      }
      const controller = new AbortController();
      activeController = controller;
      const characterId = getCharacterId();
      try {
        await service.send(
          characterId,
          content,
          (delta) => sender.send(chatChannels.delta, delta),
          controller.signal,
        );
        sender.send(chatChannels.done, service.getState(characterId));
      } catch (error) {
        if (!controller.signal.aborted) {
          sender.send(
            chatChannels.error,
            error instanceof Error ? error.message : "聊天失败",
            service.getState(characterId),
          );
          sender.send(chatChannels.done, service.getState(characterId));
        } else {
          sender.send(chatChannels.done, service.getState(characterId));
        }
      } finally {
        activeController = undefined;
      }
    },

    clear() {
      activeController?.abort();
      activeController = undefined;
      return service.clear(getCharacterId());
    },

    cancel() {
      activeController?.abort();
    },
  };
}

export function registerChatIpc(
  ipc: IpcRegistrar,
  handlers: ChatIpcHandlers,
): void {
  ipc.handle(chatChannels.getState, () => handlers.getState());
  ipc.handle(
    chatChannels.send,
    (event, content: string) => handlers.send(event.sender, content),
  );
  ipc.handle(chatChannels.clear, () => handlers.clear());
  ipc.on(chatChannels.cancel, () => handlers.cancel());
}
