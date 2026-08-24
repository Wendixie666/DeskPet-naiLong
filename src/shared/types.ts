export type Facing = "left" | "right";

export type PetAction = string;

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface PetState {
  action: PetAction;
  facing: Facing;
  isMoving: boolean;
  position: Point;
}

export interface ImageAction {
  asset: string;
  kind: "image";
}

export interface SpriteAction {
  asset: string;
  frameCount: number;
  frameDurationMs: number;
  kind: "sprite";
}

export type CharacterAction = ImageAction | SpriteAction;

export interface CharacterConfig {
  actions: Record<string, CharacterAction>;
  assetRoot: string;
  clickActions: string[];
  id: string;
  name: string;
  size: Size;
  speed: number;
}

export interface PetSnapshot {
  character: CharacterConfig;
  state: PetState;
}
