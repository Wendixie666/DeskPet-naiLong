import { randomUUID } from "node:crypto";

import type { AiConfig, CharacterConfig, ChatMessage, ChatState } from "../shared/types.ts";
import type { AiProvider, AiMessage } from "./ai-provider.ts";

export const MAX_CHAT_HISTORY = 30;

interface ChatCharacter {
  id: string;
  name: string;
  persona?: CharacterConfig["persona"];
}

interface ChatServiceOptions {
  getCharacter(characterId: string): ChatCharacter;
  getAiConfig(): AiConfig;
  getApiKey(): string;
  loadPersona(file: string): string;
  createProvider(config: AiConfig, apiKey: string): AiProvider;
}

export interface ChatService {
  getState(characterId: string): ChatState;
  send(
    characterId: string,
    content: string,
    onDelta: (delta: string) => void,
    signal?: AbortSignal,
  ): Promise<void>;
  clear(characterId: string): ChatState;
}

function message(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function systemPrompt(character: ChatCharacter, persona: string): string {
  return [
    `你正在扮演桌宠“${character.name}”。`,
    "以下是角色人格设定：",
    "--- persona ---",
    persona,
    "--- end persona ---",
    "请尽量保持角色的人格、语气和行为设定。",
  ].join("\n\n");
}

export function createChatService(options: ChatServiceOptions): ChatService {
  let characterId: string | undefined;
  let messages: ChatMessage[] = [];
  let generating = false;

  function useCharacter(nextCharacterId: string): void {
    if (characterId === nextCharacterId) {
      return;
    }
    characterId = nextCharacterId;
    messages = [];
  }

  function getState(nextCharacterId: string): ChatState {
    useCharacter(nextCharacterId);
    return {
      characterId: nextCharacterId,
      messages: [...messages],
      generating,
    };
  }

  return {
    getState,

    async send(nextCharacterId, content, onDelta, signal) {
      const normalized = content.trim();
      if (!normalized) {
        throw new Error("消息不能为空");
      }
      if (generating) {
        throw new Error("上一条消息仍在生成");
      }
      useCharacter(nextCharacterId);
      const character = options.getCharacter(nextCharacterId);
      if (!character.persona) {
        throw new Error(`角色 ${character.name} 未配置人设`);
      }
      const userMessage = message("user", normalized);
      messages.push(userMessage);
      generating = true;
      let assistantContent = "";
      let completed = false;
      try {
        const history = messages.slice(-MAX_CHAT_HISTORY).map<AiMessage>((item) => ({
          role: item.role,
          content: item.content,
        }));
        const provider = options.createProvider(
          options.getAiConfig(),
          options.getApiKey(),
        );
        for await (const delta of provider.chat({
          messages: [
            {
              role: "system",
              content: systemPrompt(character, options.loadPersona(character.persona.file)),
            },
            ...history,
          ],
          signal,
        })) {
          assistantContent += delta;
          onDelta(delta);
        }
        completed = true;
      } catch (error) {
        if (!(signal?.aborted && error instanceof Error && error.name === "AbortError")) {
          throw error;
        }
      } finally {
        if (assistantContent && (completed || signal?.aborted)) {
          messages.push(message("assistant", assistantContent));
        }
        generating = false;
      }
    },

    clear(nextCharacterId) {
      useCharacter(nextCharacterId);
      messages = [];
      return getState(nextCharacterId);
    },
  };
}
