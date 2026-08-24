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

export interface Bounds extends Point, Size {}

export interface VisualAdjustment {
  offset?: Point;
  scale?: number;
}

export interface CharacterVisual {
  contentHeight: number;
  footAnchor: Point;
}

export interface PetState {
  action: PetAction;
  facing: Facing;
  isMoving: boolean;
  position: Point;
}

export interface ImageAction {
  adjustment?: VisualAdjustment;
  asset: string;
  kind: "image";
}

export interface SpriteAction {
  adjustment?: VisualAdjustment;
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
  visual: CharacterVisual;
}

export interface PetSnapshot {
  character: CharacterConfig;
  state: PetState;
}

export type DefaultPosition = "bottom-right" | "last";

export interface AppSettings {
  characterId: string;
  defaultPosition: DefaultPosition;
  lastPosition?: Point;
  petScale: number;
  summonShortcut: string;
}

export interface CharacterSummary {
  id: string;
  name: string;
}

export interface SettingsSnapshot {
  characters: CharacterSummary[];
  petScales: number[];
  settings: AppSettings;
}
