import type { CharacterConfig } from "../shared/types";

export class CharacterRegistry {
  private readonly characters: Map<string, CharacterConfig>;
  readonly defaultCharacterId: string;

  constructor(
    configs: CharacterConfig[],
    defaultCharacterId: string,
  ) {
    for (const config of configs) {
      if (!config.actions.idle || !config.actions.walk) {
        throw new Error(`角色 ${config.id} 必须配置 idle 和 walk 动作`);
      }
      if (config.clickActions.length === 0) {
        throw new Error(`角色 ${config.id} 必须至少配置一个点击动作`);
      }
      if (config.visual.headInteraction && !config.interactionActions?.pat) {
        throw new Error(`角色 ${config.id} 配置了头部命中区域但缺少摸头动作`);
      }
      for (const action of config.clickActions) {
        if (!config.actions[action]) {
          throw new Error(`角色 ${config.id} 缺少点击动作 ${action} 的配置`);
        }
      }
      for (const [name, action] of Object.entries(config.interactionActions ?? {})) {
        if (!config.actions[action]) {
          throw new Error(`角色 ${config.id} 缺少交互动作 ${name} 的配置`);
        }
      }
      for (const [name, action] of Object.entries(config.actions)) {
        if (action.kind === "sprite"
          && action.holdFrameIndex !== undefined
          && (!Number.isInteger(action.holdFrameIndex)
            || action.holdFrameIndex < 0
            || action.holdFrameIndex >= action.frameCount)) {
          throw new Error(`角色 ${config.id} 的动作 ${name} 定格帧无效`);
        }
      }
    }
    this.characters = new Map(configs.map((config) => [config.id, config]));
    this.defaultCharacterId = defaultCharacterId;
  }

  get(characterId: string): CharacterConfig {
    const character = this.characters.get(characterId)
      ?? this.characters.get(this.defaultCharacterId);
    if (!character) {
      throw new Error("角色注册表缺少默认角色");
    }
    return character;
  }

  has(characterId: string): boolean {
    return this.characters.has(characterId);
  }

  list(): Array<{ id: string; name: string }> {
    return Array.from(this.characters.values(), (character) => ({
      id: character.id,
      name: character.name,
    }));
  }
}
