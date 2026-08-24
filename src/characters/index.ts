import type { CharacterConfig } from "../shared/types";

export class CharacterRegistry {
  private readonly characters: Map<string, CharacterConfig>;
  readonly defaultCharacterId: string;

  constructor(
    configs: CharacterConfig[],
    defaultCharacterId: string,
  ) {
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
