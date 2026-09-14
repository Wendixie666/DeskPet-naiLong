import {
  app,
  globalShortcut,
  ipcMain,
  Menu,
  screen,
} from "electron";
import path from "node:path";

import { CharacterRegistry } from "../characters";
import { naiwa } from "../characters/naiwa";
import { wangwangdan } from "../characters/wangwangdan";
import {
  constrainPosition,
  scaledSize,
} from "./pet-window";
import { openPetWindow, type PetWindowHandle } from "./pet-window-create";
import { registerPetIpc } from "./ipc";
import { showSettingsWindow } from "./settings-window";
import type {
  AppSettings,
  Point,
  SettingsSnapshot,
  Size,
} from "../shared/types";
import {
  createSettingsManager,
  supportedPetScales,
} from "./settings";
import { createShortcutManager } from "./summon-shortcut";

if (process.platform === "win32") {
  app.commandLine.appendSwitch("force-device-scale-factor", "1");
}

if (process.platform === "darwin") {
  app.dock?.hide();
}

const registry = new CharacterRegistry([naiwa, wangwangdan], naiwa.id);
const shortcuts = createShortcutManager(globalShortcut, summonAtCursor);

let handle: PetWindowHandle | undefined;
let settingsManager: ReturnType<typeof createSettingsManager>;

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
    getSettings: settingsSnapshot,
    snapshot: currentSnapshot,
    updateSettings: (value) => {
      settingsManager.update(value);
      return settingsSnapshot();
    },
  });
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
    onClosed() {
      handle = undefined;
    },
  });
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
  settingsManager = createSettingsManager(
    path.join(app.getPath("userData"), "settings.json"),
    (id) => registry.has(id),
    applySettings,
  );
  registerIpc();
  createPetWindow();

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
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
