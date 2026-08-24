import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  screen,
} from "electron";
import path from "node:path";

import { CharacterRegistry } from "../characters";
import { naiwa } from "../characters/naiwa";
import {
  constrainPosition,
  scaledSize,
} from "./pet-window";
import { createPetRuntime, type PetRuntime } from "./pet-runtime";
import type {
  AppSettings,
  Point,
  SettingsSnapshot,
  Size,
} from "../shared/types";
import {
  createSettingsManager,
  defaultSettings,
  supportedPetScales,
  type SettingsManager,
} from "./settings";

if (process.platform === "win32") {
  app.commandLine.appendSwitch("force-device-scale-factor", "1");
}

const registry = new CharacterRegistry([naiwa], naiwa.id);

let petWindow: BrowserWindow | undefined;
let settingsWindow: BrowserWindow | undefined;
let runtime: PetRuntime | undefined;
let animationTimer: NodeJS.Timeout | undefined;
let settingsManager: SettingsManager;
let registeredShortcut: string | undefined;
let pendingSummonDiagnostic: {
  cursor: Point;
  footAnchor: Point;
  computedTarget: Point;
} | undefined;

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
  if (!runtime) {
    throw new Error("桌宠尚未初始化");
  }
  return runtime.getSnapshot();
}

function settingsSnapshot(): SettingsSnapshot {
  return {
    characters: registry.list(),
    petScales: supportedPetScales,
    settings: settingsManager.get(),
  };
}

function createRuntime(position: Point, scale: number): void {
  if (!petWindow) {
    return;
  }

  runtime = createPetRuntime({
    character: registry.get(settingsManager.get().characterId),
    initialPosition: position,
    scale,
    cursorPosition: () => screen.getCursorScreenPoint(),
    onStateChange(state) {
      petWindow?.webContents.send("pet:state", state);
      if (state.action === "idle" && pendingSummonDiagnostic && petWindow) {
        const bounds = petWindow.getBounds();
        const actualFoot = {
          x: bounds.x + pendingSummonDiagnostic.footAnchor.x,
          y: bounds.y + pendingSummonDiagnostic.footAnchor.y,
        };
        console.info("[DIAG-summon]", JSON.stringify({
          actual_foot: actualFoot,
          error: {
            x: actualFoot.x - pendingSummonDiagnostic.cursor.x,
            y: actualFoot.y - pendingSummonDiagnostic.cursor.y,
          },
          final_window_bounds: bounds,
        }));
        pendingSummonDiagnostic = undefined;
      }
    },
    onSnapshotChange(snapshot) {
      petWindow?.webContents.send("pet:snapshot-changed", snapshot);
    },
    window: {
      getBounds: () => petWindow!.getBounds(),
      getPosition: () => petWindow!.getPosition(),
      setBounds: (bounds) => petWindow!.setBounds(bounds),
      setPosition: (x, y) => petWindow!.setPosition(x, y),
      workAreaAt: (point) => screen.getDisplayNearestPoint(point).workArea,
    },
  });
}

export function summon(x: number, y: number): void {
  if (!petWindow || !runtime) {
    return;
  }
  runtime.summon({ x, y });
}

function summonAtCursor(): void {
  const cursor = screen.getCursorScreenPoint();
  if (!petWindow || !runtime) {
    return;
  }
  const snapshot = runtime.getSnapshot();
  const bounds = petWindow.getBounds();
  const footAnchor = {
    x: snapshot.character.visual.footAnchor.x * runtime.getScale(),
    y: snapshot.character.visual.footAnchor.y * runtime.getScale(),
  };
  const workArea = screen.getDisplayNearestPoint(cursor).workArea;
  const computedTarget = constrainPosition({
    x: cursor.x - footAnchor.x,
    y: cursor.y - footAnchor.y,
  }, bounds, workArea);
  pendingSummonDiagnostic = { cursor, footAnchor, computedTarget };
  console.info("[DIAG-summon]", JSON.stringify({
    cursor,
    footAnchor,
    computed_target: computedTarget,
    before_window_bounds: bounds,
  }));
  summon(cursor.x, cursor.y);
  console.info("[DIAG-summon]", JSON.stringify({
    after_summon_window_bounds: petWindow.getBounds(),
  }));
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

function tryRegisterShortcut(shortcut: string): boolean {
  try {
    return globalShortcut.register(shortcut, summonAtCursor);
  } catch {
    return false;
  }
}

function registerSummonShortcut(shortcut: string): boolean {
  if (registeredShortcut === shortcut) {
    return true;
  }

  const previousShortcut = registeredShortcut;
  if (previousShortcut) {
    globalShortcut.unregister(previousShortcut);
  }

  if (tryRegisterShortcut(shortcut)) {
    registeredShortcut = shortcut;
    return true;
  }

  registeredShortcut = undefined;
  if (previousShortcut && tryRegisterShortcut(previousShortcut)) {
    registeredShortcut = previousShortcut;
  }
  return false;
}

function applySettings(next: AppSettings): void {
  if (!registerSummonShortcut(next.summonShortcut)) {
    throw new Error(`快捷键 ${next.summonShortcut} 无法注册，可能已被其他应用占用`);
  }

  if (runtime) {
    runtime.applyCharacter(registry.get(next.characterId), next.petScale);
  }
}

function showSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 460,
    height: 500,
    minWidth: 420,
    minHeight: 460,
    title: "桌宠设置",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload/settings.js"),
      sandbox: true,
    },
  });
  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadFile(path.join(app.getAppPath(), "src/renderer/settings.html"));
  settingsWindow.on("closed", () => {
    settingsWindow = undefined;
  });
}

function showPetContextMenu(): void {
  if (!petWindow) {
    return;
  }
  const menu = Menu.buildFromTemplate([
    {
      label: "设置",
      click: showSettingsWindow,
    },
  ]);
  menu.popup({ window: petWindow });
}

function registerIpc(): void {
  ipcMain.handle("pet:snapshot", currentSnapshot);
  ipcMain.on("pet:click", () => runtime?.click());
  ipcMain.on("pet:drag-by", (_event, deltaX: number, deltaY: number) => {
    runtime?.dragBy(deltaX, deltaY);
  });
  ipcMain.on("pet:summon", (_event, targetX: number, targetY: number) => {
    summon(targetX, targetY);
  });
  ipcMain.on("pet:context-menu", showPetContextMenu);

  ipcMain.handle("settings:get", settingsSnapshot);
  ipcMain.handle("settings:update", (_event, value: unknown) => {
    settingsManager.update(value);
    return settingsSnapshot();
  });
}

function createPetWindow(): void {
  const settings = settingsManager.get();
  const character = registry.get(settings.characterId);
  const size = scaledSize(character, settings.petScale);
  const position = initialPosition(size);

  petWindow = new BrowserWindow({
    ...size,
    ...position,
    alwaysOnTop: true,
    backgroundColor: "#00000000",
    frame: false,
    hasShadow: false,
    resizable: false,
    show: false,
    skipTaskbar: true,
    transparent: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: true,
    },
  });

  createRuntime(position, settings.petScale);
  petWindow.loadFile(path.join(app.getAppPath(), "src/renderer/index.html"));
  petWindow.once("ready-to-show", () => petWindow?.show());

  let previousTime = performance.now();
  animationTimer = setInterval(() => {
    const currentTime = performance.now();
    runtime?.tick(currentTime - previousTime);
    previousTime = currentTime;
  }, 16);

  petWindow.on("closed", () => {
    if (animationTimer) {
      clearInterval(animationTimer);
    }
    animationTimer = undefined;
    runtime = undefined;
    petWindow = undefined;
  });
}

function saveLastPosition(): void {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }
  const [x, y] = petWindow.getPosition();
  settingsManager.saveLastPosition({ x, y });
}

app.whenReady().then(() => {
  void logGpuDiagnostics();
  settingsManager = createSettingsManager(
    path.join(app.getPath("userData"), "settings.json"),
    (id) => registry.has(id),
    applySettings,
  );
  const settings = settingsManager.get();
  registerIpc();
  createPetWindow();

  try {
    settingsManager.activate();
  } catch (error) {
    console.error(error);
  }

  app.on("activate", () => {
    if (!petWindow) {
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
