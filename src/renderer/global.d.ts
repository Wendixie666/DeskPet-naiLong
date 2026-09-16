import type {
  AppTheme,
  TodoDeadlinePrecision,
  TodoItem,
} from "../shared/types";

declare global {
  interface Window {
    desktopPet: typeof import("../preload/index").desktopPetBridge;
    desktopSettings: typeof import("../preload/settings").desktopSettingsBridge;
    desktopMemo: {
      getTheme(): Promise<AppTheme>;
      onThemeChanged(listener: (theme: AppTheme) => void): () => void;
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
    desktopChat: typeof import("../preload/chat").desktopChatBridge;
    desktopReminderOverlay: {
      click(): void;
      onHide(listener: () => void): void;
      onShow(listener: (text: string) => void): void;
    };
  }
}

export {};
