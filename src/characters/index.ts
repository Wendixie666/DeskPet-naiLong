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
      for (const action of config.clickActions) {
        if (!config.actions[action]) {
          throw new Error(`角色 ${config.id} 缺少点击动作 ${action} 的配置`);
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
