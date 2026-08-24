import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { AppSettings, AppTheme, DefaultPosition, Point } from "../shared/types";

export const supportedPetScales = [0.75, 1, 1.25, 1.5];
const supportedScales = new Set(supportedPetScales);

export const defaultSettings: AppSettings = {
  characterId: "naiwa",
  defaultPosition: "bottom-right",
  petScale: 1,
  summonShortcut: "CommandOrControl+Alt+P",
  theme: "light",
};

interface SettingsStore {
  load(): AppSettings;
  normalize(value: unknown): AppSettings;
  save(settings: AppSettings): AppSettings;
}

export interface SettingsManager {
  activate(): void;
  get(): AppSettings;
  saveLastPosition(position: Point): void;
  update(value: unknown): AppSettings;
}

function isPoint(value: unknown): value is Point {
  if (!value || typeof value !== "object") {
    return false;
  }
  const point = value as Partial<Point>;
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function normalizeSettings(
  value: unknown,
  isCharacterId: (id: string) => boolean,
): AppSettings {
  if (!value || typeof value !== "object") {
    return { ...defaultSettings };
  }

  const candidate = value as Partial<AppSettings>;
  const characterId = typeof candidate.characterId === "string"
    && isCharacterId(candidate.characterId)
    ? candidate.characterId
    : defaultSettings.characterId;
  const petScale = typeof candidate.petScale === "number"
    && supportedScales.has(candidate.petScale)
    ? candidate.petScale
    : defaultSettings.petScale;
  const defaultPosition: DefaultPosition = candidate.defaultPosition === "last"
    || candidate.defaultPosition === "bottom-right"
    ? candidate.defaultPosition
    : defaultSettings.defaultPosition;
  const summonShortcut = typeof candidate.summonShortcut === "string"
    && candidate.summonShortcut.trim().length > 0
    ? candidate.summonShortcut.trim()
    : defaultSettings.summonShortcut;
  const theme: AppTheme = candidate.theme === "dark"
    || candidate.theme === "light"
    ? candidate.theme
    : defaultSettings.theme;

  const settings: AppSettings = {
    characterId,
    defaultPosition,
    petScale,
    summonShortcut,
    theme,
  };
  if (isPoint(candidate.lastPosition)) {
    settings.lastPosition = {
      x: Math.round(candidate.lastPosition.x),
      y: Math.round(candidate.lastPosition.y),
    };
  }
  return settings;
}

function createSettingsStore(
  filePath: string,
  isCharacterId: (id: string) => boolean,
): SettingsStore {
  return {
    load() {
      try {
        const content = readFileSync(filePath, "utf8");
        return normalizeSettings(JSON.parse(content), isCharacterId);
      } catch {
        return { ...defaultSettings };
      }
    },

    normalize(value) {
      return normalizeSettings(value, isCharacterId);
    },

    save(settings) {
      const normalized = normalizeSettings(settings, isCharacterId);
      mkdirSync(path.dirname(filePath), { recursive: true });
      const temporaryPath = `${filePath}.tmp`;
      writeFileSync(temporaryPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
      renameSync(temporaryPath, filePath);
      return normalized;
    },
  };
}

export function createSettingsManager(
  filePath: string,
  isCharacterId: (id: string) => boolean,
  apply: (next: AppSettings, previous: AppSettings) => void,
): SettingsManager {
  const store = createSettingsStore(filePath, isCharacterId);
  let current = store.load();

  return {
    activate() {
      apply(current, current);
    },

    get() {
      if (!current.lastPosition) {
        return { ...current };
      }
      return {
        ...current,
        lastPosition: { ...current.lastPosition },
      };
    },

    saveLastPosition(position) {
      current = store.save({
        ...current,
        lastPosition: position,
      });
    },

    update(value) {
      const normalized = store.normalize(value);
      const next = {
        ...normalized,
        lastPosition: current.lastPosition,
      };
      const persisted = store.save(next);
      try {
        apply(persisted, current);
      } catch (error) {
        store.save(current);
        apply(current, persisted);
        throw error;
      }
      current = persisted;
      return this.get();
    },
  };
}
