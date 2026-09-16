import {
  app,
  globalShortcut,
  ipcMain,
  Menu,
  Notification,
  safeStorage,
  screen,
} from "electron";
import path from "node:path";

import { CharacterRegistry } from "../characters";
import { naiwa } from "../characters/naiwa";
import { createAiConfigStore, type AiConfigStore } from "../ai/ai-config";
import {
  createAiCredentialStore,
  type AiCredentialStore,
} from "../ai/ai-credential-store";
import { createChatService, type ChatService } from "../ai/chat-service";
import { OpenAiCompatibleProvider } from "../ai/openai-compatible-provider";
import { createPersonaLoader } from "../ai/persona-loader";
import {
  constrainPosition,
  scaledSize,
} from "./pet-window";
import { openPetWindow, type PetWindowHandle } from "./pet-window-create";
import { registerPetIpc } from "./ipc";
import { registerSettingsSaveIpc } from "./settings-save-ipc";
import { createSettingsCoordinator } from "./settings-coordinator";
import {
  createAiSettingsIpcHandlers,
  registerAiSettingsIpc,
} from "./ai-settings-ipc";
import { showSettingsWindow } from "./settings-window";
import { setChatWindowCloseHandler, showChatWindow } from "./chat-window";
import { createChatIpcHandlers, registerChatIpc, type ChatIpcHandlers } from "./chat-ipc";
import { notifyMemoTheme, showMemoWindow } from "./memo-window";
import { registerMemoIpc, createMemoIpcHandlers } from "./memo-ipc";
import { createTodoStore, type TodoStore } from "./todo-store";
import { createReminderScheduler, type ReminderScheduler } from "./reminder-scheduler";
import type {
  AppSettings,
  Point,
  SettingsSnapshot,
  Size,
  TodoItem,
} from "../shared/types";
import {
  createSettingsManager,
  supportedPetScales,
} from "./settings";
import { createShortcutManager } from "./summon-shortcut";
import {
  createKeyboardActivityService,
  createUiohookKeyboardActivityHook,
  type KeyboardActivityService,
} from "./keyboard-activity";

if (process.platform === "win32") {
  app.commandLine.appendSwitch("force-device-scale-factor", "1");
}

if (process.platform === "darwin") {
  app.dock?.hide();
}

const registry = new CharacterRegistry([naiwa], naiwa.id);
const shortcuts = createShortcutManager(globalShortcut, summonAtCursor);

let handle: PetWindowHandle | undefined;
let settingsManager: ReturnType<typeof createSettingsManager>;
let keyboardActivityService: KeyboardActivityService | undefined;
let todoStore: TodoStore;
let reminderScheduler: ReminderScheduler;
let aiConfigStore: AiConfigStore;
let aiCredentialStore: AiCredentialStore;
let chatService: ChatService;
let chatIpcHandlers: ChatIpcHandlers;

function bottomRightPosition(size: Size): Point {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: workArea.x + workArea.width - size.width - 24,
    y: workArea.y + workArea.height - size.height - 24,
  };
}

function initialPosition(size: Size): Point {
  const settings = settingsManager.get();
  if (settings.defaultPosition !== "last" || !settings.lastPosition) {
    return bottomRightPosition(size);
  }

  const display = screen.getDisplayMatching({
    ...settings.lastPosition,
    ...size,
  });
  return constrainPosition(settings.lastPosition, size, display.workArea);
}

function currentSnapshot() {
  if (!handle) {
    throw new Error("桌宠尚未初始化");
  }
  return handle.runtime.getSnapshot();
}

function settingsSnapshot(): SettingsSnapshot {
  return {
    characters: registry.list(),
    petScales: supportedPetScales,
    settings: settingsManager.get(),
  };
}

function summonAtCursor(): void {
  const cursor = screen.getCursorScreenPoint();
  handle?.runtime.summon({ x: cursor.x, y: cursor.y });
}

function showSystemReminder(todo: TodoItem): void {
  if (Notification.isSupported()) {
    new Notification({
      title: "奶蛙提醒你",
      body: todo.text,
    }).show();
  }
}

function logAiStorageDiagnostics(): void {
  if (process.platform !== "linux" || !safeStorage.isEncryptionAvailable()) {
    return;
  }
  if (safeStorage.getSelectedStorageBackend() === "basic_text") {
    console.info("[DIAG-ai] Linux safeStorage 使用低安全级别后端");
  }
}

async function logGpuDiagnostics(): Promise<void> {
  try {
    console.info("[DIAG-gpu]", JSON.stringify({
      commandLine: process.argv.slice(1),
      featureStatus: app.getGPUFeatureStatus(),
      info: await app.getGPUInfo("basic"),
    }));
  } catch (error) {
    console.info("[DIAG-gpu]", JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

function applySettings(next: AppSettings): void {
  if (!shortcuts.apply(next.summonShortcut)) {
    throw new Error(`快捷键 ${next.summonShortcut} 无法注册，可能已被其他应用占用`);
  }

  if (handle) {
    handle.runtime.applyCharacter(registry.get(next.characterId), next.petScale);
  }
}

function showPetContextMenu(): void {
  if (!handle) {
    return;
  }
  const menu = Menu.buildFromTemplate([
    {
      label: "工具箱",
      submenu: [
        {
          label: "聊天",
          click: showChatWindow,
        },
        {
          label: "备忘录",
          click: showMemoWindow,
        },
      ],
    },
    {
      label: "设置",
      click: showSettingsWindow,
    },
    {
      label: "退出",
      click: () => app.quit(),
    },
  ]);
  menu.popup({ window: handle.window });
}

function registerIpc(): void {
  registerPetIpc(ipcMain, {
    click: () => handle?.runtime.click(),
    contextMenu: showPetContextMenu,
    dragBy: (deltaX, deltaY) => handle?.runtime.dragBy(deltaX, deltaY),
    endDrag: () => handle?.runtime.endDrag(),
    endPat: () => handle?.runtime.endPat(),
    getSettings: settingsSnapshot,
    snapshot: currentSnapshot,
    startPat: () => handle?.runtime.startPat(),
    updateSettings: (value) => {
      settingsManager.update(value);
      const snapshot = settingsSnapshot();
      notifyMemoTheme(snapshot.settings.theme);
      return snapshot;
    },
  });
  registerMemoIpc(ipcMain, createMemoIpcHandlers(todoStore));
  const aiSettingsHandlers = createAiSettingsIpcHandlers(
    aiConfigStore,
    aiCredentialStore,
    (url, init) => fetch(url, init),
  );
  registerAiSettingsIpc(ipcMain, aiSettingsHandlers);
  registerSettingsSaveIpc(
    ipcMain,
    createSettingsCoordinator(
      settingsManager,
      aiSettingsHandlers,
      settingsSnapshot,
      (snapshot) => notifyMemoTheme(snapshot.settings.theme),
    ),
  );
  registerChatIpc(ipcMain, chatIpcHandlers);
}

function createPetWindow(): void {
  const settings = settingsManager.get();
  const character = registry.get(settings.characterId);
  const size = scaledSize(character, settings.petScale);

  handle = openPetWindow({
    character,
    scale: settings.petScale,
    size,
    initialPosition: initialPosition(size),
    cursorPosition: () => screen.getCursorScreenPoint(),
    workAreaAt: (point) => screen.getDisplayNearestPoint(point).workArea,
    onReminderClick: showMemoWindow,
    onReminderFallback: showSystemReminder,
    onClosed() {
      handle = undefined;
    },
  });
}

function startKeyboardActivity(): void {
  try {
    keyboardActivityService = createKeyboardActivityService(
      createUiohookKeyboardActivityHook(),
      () => handle?.runtime.keyboardActivity(),
      (message) => {
        const permissionHint = process.platform === "darwin"
          ? "；macOS 请在“系统设置 > 隐私与安全性 > 输入监控”允许本应用"
          : "";
        console.info(`[DIAG-keyboard] ${message}${permissionHint}`);
      },
    );
    keyboardActivityService.start();
  } catch {
    console.info("[DIAG-keyboard] 全局键盘监听不可用，桌宠其他功能继续运行");
  }
}

function saveLastPosition(): void {
  if (!handle || handle.window.isDestroyed()) {
    return;
  }
  const [x, y] = handle.window.getPosition();
  settingsManager.saveLastPosition({ x, y });
}

app.whenReady().then(() => {
  void logGpuDiagnostics();
  logAiStorageDiagnostics();
  settingsManager = createSettingsManager(
    path.join(app.getPath("userData"), "settings.json"),
    (id) => registry.has(id),
    applySettings,
  );
  todoStore = createTodoStore(path.join(app.getPath("userData"), "todos.json"));
  aiConfigStore = createAiConfigStore(path.join(app.getPath("userData"), "ai-config.json"));
  aiCredentialStore = createAiCredentialStore(
    path.join(app.getPath("userData"), "ai-api-key.bin"),
    safeStorage,
  );
  chatService = createChatService({
    getCharacter: (characterId) => registry.get(characterId),
    getAiConfig: () => aiConfigStore.load(),
    getApiKey: () => aiCredentialStore.read(),
    loadPersona: (file) => createPersonaLoader(
      path.join(app.getAppPath(), "src/characters/personas"),
    ).load(file),
    createProvider: (config, apiKey) => new OpenAiCompatibleProvider(config, apiKey),
  });
  chatIpcHandlers = createChatIpcHandlers(
    chatService,
    () => settingsManager.get().characterId,
  );
  setChatWindowCloseHandler(() => chatIpcHandlers.cancel());
  reminderScheduler = createReminderScheduler({
    store: todoStore,
    onReminder(todo) {
      if (!handle || !handle.runtime.triggerReminder(todo)) {
        showSystemReminder(todo);
      }
    },
  });
  registerIpc();
  createPetWindow();
  reminderScheduler.start();
  startKeyboardActivity();

  try {
    settingsManager.activate();
  } catch (error) {
    console.error(error);
  }

  app.on("activate", () => {
    if (!handle) {
      createPetWindow();
    }
  });
});

app.on("before-quit", saveLastPosition);

app.on("will-quit", () => {
  reminderScheduler?.stop();
  keyboardActivityService?.stop();
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
