export type Facing = "left" | "right";

import type { LookDirection } from "../pet/look-direction";

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
  actionSequence: number;
  action: PetAction;
  facing: Facing;
  isMoving: boolean;
  lookDirection?: LookDirection;
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

export interface DirectionalSpriteAction {
  adjustment?: VisualAdjustment;
  assets: [string, string];
  frameCount: number;
  frameDurationMs: number;
  kind: "directional-sprite";
}

export type CharacterAction = ImageAction | SpriteAction | DirectionalSpriteAction;

export interface CharacterConfig {
  actions: Record<string, CharacterAction>;
  assetRoot: string;
  clickActions: string[];
  id: string;
  name: string;
  size: Size;
  speed: number;
  trackingAction?: string;
  visual: CharacterVisual;
}

export interface PetSnapshot {
  character: CharacterConfig;
  state: PetState;
}

export type DefaultPosition = "bottom-right" | "last";
export type AppTheme = "light" | "dark" | "transparent";

export interface AppSettings {
  characterId: string;
  defaultPosition: DefaultPosition;
  lastPosition?: Point;
  petScale: number;
  summonShortcut: string;
  theme: AppTheme;
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
