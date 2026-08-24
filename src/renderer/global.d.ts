import type {
  AppSettings,
  PetSnapshot,
  PetState,
  SettingsSnapshot,
} from "../shared/types";

declare global {
  interface Window {
    desktopPet: {
      click(): void;
      dragBy(deltaX: number, deltaY: number): void;
      getSnapshot(): Promise<PetSnapshot>;
      onSnapshotChange(listener: (snapshot: PetSnapshot) => void): () => void;
      onStateChange(listener: (state: PetState) => void): () => void;
      openContextMenu(): void;
      summon(x: number, y: number): void;
    };
    desktopSettings: {
      get(): Promise<SettingsSnapshot>;
      update(settings: AppSettings): Promise<SettingsSnapshot>;
    };
  }
}

export {};
