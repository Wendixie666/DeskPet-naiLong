import type {
  AppSettings,
  SettingsSnapshot,
  TodoDeadlinePrecision,
  TodoItem,
} from "../shared/types";

declare global {
  interface Window {
    desktopPet: typeof import("../preload/index").desktopPetBridge;
    desktopSettings: {
      get(): Promise<SettingsSnapshot>;
      update(settings: AppSettings): Promise<SettingsSnapshot>;
    };
    desktopMemo: {
      list(): Promise<TodoItem[]>;
      create(text: string): Promise<TodoItem>;
      updateText(id: string, text: string): Promise<TodoItem>;
      updateDeadline(
        id: string,
        deadline?: string,
        deadlinePrecision?: TodoDeadlinePrecision,
      ): Promise<TodoItem>;
      complete(id: string): Promise<TodoItem>;
      remove(id: string): Promise<void>;
    };
  }
}

export {};
