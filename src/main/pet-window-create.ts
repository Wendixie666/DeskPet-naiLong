import { app, BrowserWindow } from "electron";
import path from "node:path";

import type {
  Bounds,
  CharacterConfig,
  PetSnapshot,
  PetState,
  Point,
  Size,
  TodoItem,
} from "../shared/types";
import { createPetRuntime, type PetRuntime } from "./pet-runtime";
import { petChannels } from "../shared/channels.ts";
import {
  createReminderOverlay,
  type ReminderOverlay,
} from "./reminder-overlay";
import { loadRendererPage } from "./window-loader";

export interface OpenPetWindowOptions {
  character: CharacterConfig;
  cursorPosition(): Point;
  initialPosition: Point;
  onClosed(): void;
  onReminderClick(): void;
  onReminderFallback(todo: TodoItem): void;
  scale: number;
  size: Size;
  workAreaAt(point: Point): Bounds;
}

export interface PetWindowHandle {
  runtime: PetRuntime;
  window: BrowserWindow;
}

export function openPetWindow(options: OpenPetWindowOptions): PetWindowHandle {
  const window = new BrowserWindow({
    ...options.size,
    ...options.initialPosition,
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
      sandbox: false,
    },
  });

  if (process.platform === "darwin") {
    window.setAlwaysOnTop(true, "screen-saver");
    window.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
  }

  let reminderOverlay: ReminderOverlay | undefined;
  let reminderOverlayFailed = false;
  let currentReminder: TodoItem | undefined;
  let runtime: PetRuntime;
  try {
    reminderOverlay = createReminderOverlay({
      anchor: {
        getBounds: () => window.getBounds(),
        workAreaAt: options.workAreaAt,
      },
      onClick() {
        runtime.dismissReminder();
        options.onReminderClick();
      },
      onError() {
        reminderOverlayFailed = true;
        if (currentReminder) {
          options.onReminderFallback(currentReminder);
          currentReminder = undefined;
        }
      },
    });
  } catch (error) {
    console.error("提醒卡片窗口创建失败", error);
    reminderOverlayFailed = true;
  }

  runtime = createPetRuntime({
    character: options.character,
    initialPosition: options.initialPosition,
    scale: options.scale,
    cursorPosition: options.cursorPosition,
    tickMs: 16,
    onStateChange(state: PetState) {
      reminderOverlay?.syncPosition();
      window.webContents.send(petChannels.state, state);
    },
    onReminderChange(todo) {
      currentReminder = todo;
      if (!todo) {
        reminderOverlay?.hide();
        return;
      }
      if (!reminderOverlay || reminderOverlayFailed) {
        currentReminder = undefined;
        options.onReminderFallback(todo);
        return;
      }
      reminderOverlay.show(todo.text);
    },
    onSnapshotChange(snapshot: PetSnapshot) {
      window.webContents.send(petChannels.snapshotChanged, snapshot);
    },
    window: {
      getBounds: () => window.getBounds(),
      getPosition: () => window.getPosition(),
      setBounds: (bounds) => window.setBounds(bounds),
      setPosition: (x, y) => window.setPosition(x, y),
      workAreaAt: options.workAreaAt,
    },
  });

  void loadRendererPage(window, "index.html", app.getAppPath());

  window.on("closed", () => {
    runtime.dispose();
    reminderOverlay?.dispose();
    options.onClosed();
  });

  return { window, runtime };
}
