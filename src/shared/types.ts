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
  headInteraction?: Bounds;
  perchAnchorY?: number;
}

export interface CharacterInteractionActions {
  climb: string;
  drag: string;
  pat?: string;
  reminder?: string;
  windowPerch?: string;
}

export interface CharacterChatUi {
  emptyState: string;
  title: string;
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
  anchor?: "foot" | "perch";
  adjustment?: VisualAdjustment;
  asset: string;
  kind: "image";
}

export interface SpriteAction {
  anchor?: "foot" | "perch";
  adjustment?: VisualAdjustment;
  asset: string;
  frameCount: number;
  frameDurationMs: number;
  holdFrameIndex?: number;
  kind: "sprite";
}

export interface DirectionalSpriteAction {
  anchor?: "foot" | "perch";
  adjustment?: VisualAdjustment;
  assets: [string, string];
  frameCount: number;
  frameDurationMs: number;
  kind: "directional-sprite";
  directionalMode?: "direct-16";
}

export type CharacterAction = ImageAction | SpriteAction | DirectionalSpriteAction;

export interface CharacterConfig {
  actions: Record<string, CharacterAction>;
  assetRoot: string;
  chatUi: CharacterChatUi;
  clickActions: string[];
  id: string;
  interactionActions?: CharacterInteractionActions;
  name: string;
  persona?: {
    file: string;
  };
  size: Size;
  speed: number;
  trackingAction?: string;
  visual: CharacterVisual;
}

export interface PetSnapshot {
  character: CharacterConfig;
  state: PetState;
}

export interface SystemWindow {
  id: string;
  bounds: Bounds;
  isMinimized: boolean;
  isOrdinary: boolean;
}

export type DefaultPosition = "bottom-right" | "last";
export type AppTheme = "light" | "dark";

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

export interface AiConfig {
  provider: "openai-compatible" | "deepseek";
  baseUrl: string;
  model: string;
}

export interface AiSettingsSnapshot {
  config: AiConfig;
  hasApiKey: boolean;
}

export interface AiConnectionTestResult {
  ok: boolean;
  message: string;
}

export interface SettingsSaveRequest {
  settings: AppSettings;
  ai?: {
    config: AiConfig;
    apiKey?: string;
  };
}

export interface SettingsSaveResult {
  ok: boolean;
  message: string;
  saved: {
    app: boolean;
    ai: boolean;
  };
  settings: SettingsSnapshot;
  aiSettings: AiSettingsSnapshot;
}

export type ChatMessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
}

export interface ChatState {
  characterId: string;
  chatUi: CharacterChatUi;
  messages: ChatMessage[];
  generating: boolean;
}

export type TodoDeadlinePrecision = "date" | "date-time";

export const DEFAULT_TODO_DATE_DEADLINE_TIME = "23:59";

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  deadline?: string;
  deadlinePrecision?: TodoDeadlinePrecision;
  reminderTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}
