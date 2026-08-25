import type { AppSettings, SettingsSnapshot } from "../shared/types";

declare global {
  interface Window {
    desktopPet: typeof import("../preload/index").desktopPetBridge;
    desktopSettings: {
      get(): Promise<SettingsSnapshot>;
      update(settings: AppSettings): Promise<SettingsSnapshot>;
    };
  }
}

export {};
