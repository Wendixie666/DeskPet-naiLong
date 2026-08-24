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
  createInteractionController,
  type InteractionController,
} from "../interaction/controller";
import {
  createPetController,
  type PetController,
} from "../pet/controller";
import type {
  AppSettings,
  CharacterConfig,
  Point,
  SettingsSnapshot,
  Size,
} from "../shared/types";
import {
  createSettingsStore,
  defaultSettings,
  type SettingsStore,
} from "./settings";
import {
  constrainWindowPosition,
  cursorToWindowPosition,
} from "./system-input";

const registry = new CharacterRegistry([naiwa], naiwa.id);

let petWindow: BrowserWindow | undefined;
let settingsWindow: BrowserWindow | undefined;
let interaction: InteractionController | undefined;
let pet: PetController | undefined;
let animationTimer: NodeJS.Timeout | undefined;
let settingsStore: SettingsStore;
let settings: AppSettings = { ...defaultSettings };
let character: CharacterConfig = registry.get(defaultSettings.characterId);
let registeredShortcut: string | undefined;

function scaledSize(config: CharacterConfig, scale: number): Size {
  return {
    width: Math.round(config.size.width * scale),
    height: Math.round(config.size.height * scale),
  };
}

function scaledFootAnchor(config: CharacterConfig, scale: number): Point {
  return {
    x: config.visual.footAnchor.x * scale,
    y: config.visual.footAnchor.y * scale,
  };
}

function bottomRightPosition(size: Size): Point {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: workArea.x + workArea.width - size.width - 24,
    y: workArea.y + workArea.height - size.height - 24,
  };
}

function initialPosition(size: Size): Point {
  if (settings.defaultPosition !== "last" || !settings.lastPosition) {
    return bottomRightPosition(size);
  }

  const display = screen.getDisplayMatching({
    ...settings.lastPosition,
    ...size,
  });
  return constrainWindowPosition(settings.lastPosition, size, display.workArea);
}

function currentSnapshot() {
  if (!pet) {
    throw new Error("桌宠尚未初始化");
  }
  return {
    character,
    state: pet.getState(),
  };
}

function settingsSnapshot(): SettingsSnapshot {
  return {
    characters: registry.list(),
    settings,
  };
}

function configurePet(position: Point): void {
  if (!petWindow) {
    return;
  }

  pet = createPetController({
    clickActions: character.clickActions,
    initialPosition: position,
    speed: character.speed,
  });
  interaction = createInteractionController({
    pet,
    window: petWindow,
    onStateChange(state) {
      petWindow?.webContents.send("pet:state", state);
    },
  });

  petWindow.webContents.send("pet:snapshot-changed", currentSnapshot());
}

export function summon(x: number, y: number): void {
  if (!petWindow || !interaction) {
    return;
  }

  const cursor = { x, y };
  const bounds = petWindow.getBounds();
  const display = screen.getDisplayNearestPoint(cursor);
  const target = cursorToWindowPosition(
    cursor,
    bounds,
    scaledFootAnchor(character, settings.petScale),
    display.workArea,
  );
  interaction.summon(target.x, target.y);
}

function summonAtCursor(): void {
  const cursor = screen.getCursorScreenPoint();
  summon(cursor.x, cursor.y);
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

function resizeAndConfigurePet(nextCharacter: CharacterConfig, scale: number): void {
  if (!petWindow) {
    character = nextCharacter;
    return;
  }

  const previousBounds = petWindow.getBounds();
  const previousAnchor = scaledFootAnchor(character, settings.petScale);
  const footPosition = {
    x: previousBounds.x + previousAnchor.x,
    y: previousBounds.y + previousAnchor.y,
  };
  const size = scaledSize(nextCharacter, scale);
  const display = screen.getDisplayNearestPoint(footPosition);
  const position = cursorToWindowPosition(
    footPosition,
    size,
    scaledFootAnchor(nextCharacter, scale),
    display.workArea,
  );

  character = nextCharacter;
  petWindow.setSize(size.width, size.height);
  petWindow.setPosition(position.x, position.y);
  configurePet(position);
}

function applySettings(next: AppSettings): void {
  if (!registerSummonShortcut(next.summonShortcut)) {
    throw new Error(`快捷键 ${next.summonShortcut} 无法注册，可能已被其他应用占用`);
  }

  if (
    next.characterId !== settings.characterId
    || next.petScale !== settings.petScale
  ) {
    resizeAndConfigurePet(registry.get(next.characterId), next.petScale);
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
  ipcMain.on("pet:click", () => interaction?.click());
  ipcMain.on("pet:drag-by", (_event, deltaX: number, deltaY: number) => {
    interaction?.dragBy(deltaX, deltaY);
  });
  ipcMain.on("pet:summon", (_event, targetX: number, targetY: number) => {
    summon(targetX, targetY);
  });
  ipcMain.on("pet:context-menu", showPetContextMenu);

  ipcMain.handle("settings:get", settingsSnapshot);
  ipcMain.handle("settings:update", (_event, value: unknown) => {
    const next = settingsStore.normalize(value);
    applySettings(next);
    settings = settingsStore.save({
      ...next,
      lastPosition: settings.lastPosition,
    });
    return settingsSnapshot();
  });
}

function createPetWindow(): void {
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

  configurePet(position);
  petWindow.loadFile(path.join(app.getAppPath(), "src/renderer/index.html"));
  petWindow.once("ready-to-show", () => petWindow?.show());

  let previousTime = performance.now();
  animationTimer = setInterval(() => {
    const currentTime = performance.now();
    interaction?.tick(currentTime - previousTime);
    previousTime = currentTime;
  }, 16);

  petWindow.on("closed", () => {
    if (animationTimer) {
      clearInterval(animationTimer);
    }
    animationTimer = undefined;
    interaction = undefined;
    pet = undefined;
    petWindow = undefined;
  });
}

function saveLastPosition(): void {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }
  const [x, y] = petWindow.getPosition();
  settings = settingsStore.save({
    ...settings,
    lastPosition: { x, y },
  });
}

app.whenReady().then(() => {
  settingsStore = createSettingsStore(
    path.join(app.getPath("userData"), "settings.json"),
    (id) => registry.has(id),
  );
  settings = settingsStore.load();
  character = registry.get(settings.characterId);
  registerIpc();
  createPetWindow();

  if (!registerSummonShortcut(settings.summonShortcut)) {
    console.error(`无法注册桌宠召唤快捷键：${settings.summonShortcut}`);
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
  app.quit();
});
