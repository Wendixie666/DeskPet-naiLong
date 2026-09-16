import type {
  AiConfig,
  AiConnectionTestResult,
  AiSettingsSnapshot,
  AppTheme,
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
      getAiSettings(): Promise<AiSettingsSnapshot>;
      updateAiSettings(config: AiConfig): Promise<AiSettingsSnapshot>;
      saveApiKey(apiKey: string): Promise<AiSettingsSnapshot>;
      removeApiKey(): Promise<AiSettingsSnapshot>;
      testAiConnection(
        config: AiConfig,
        apiKey?: string,
      ): Promise<AiConnectionTestResult>;
    };
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
    desktopReminderOverlay: {
      click(): void;
      onHide(listener: () => void): void;
      onShow(listener: (text: string) => void): void;
    };
  }
}

export {};
