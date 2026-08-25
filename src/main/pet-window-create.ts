import { app, BrowserWindow } from "electron";
import path from "node:path";

import type {
  Bounds,
  CharacterConfig,
  PetSnapshot,
  PetState,
  Point,
  Size,
} from "../shared/types";
import { createPetRuntime, type PetRuntime } from "./pet-runtime";

export interface OpenPetWindowOptions {
  character: CharacterConfig;
  cursorPosition(): Point;
  initialPosition: Point;
  onClosed(): void;
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
      sandbox: true,
    },
  });

  if (process.platform === "darwin") {
    window.setAlwaysOnTop(true, "screen-saver");
    window.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
  }

  const runtime = createPetRuntime({
    character: options.character,
    initialPosition: options.initialPosition,
    scale: options.scale,
    cursorPosition: options.cursorPosition,
    tickMs: 16,
    onStateChange(state: PetState) {
      window.webContents.send("pet:state", state);
    },
    onSnapshotChange(snapshot: PetSnapshot) {
      window.webContents.send("pet:snapshot-changed", snapshot);
    },
    window: {
      getBounds: () => window.getBounds(),
      getPosition: () => window.getPosition(),
      setBounds: (bounds) => window.setBounds(bounds),
      setPosition: (x, y) => window.setPosition(x, y),
      workAreaAt: options.workAreaAt,
    },
  });

  window.loadFile(path.join(app.getAppPath(), "src/renderer/index.html"));
  window.once("ready-to-show", () => window.show());

  window.on("closed", () => {
    runtime.dispose();
    options.onClosed();
  });

  return { window, runtime };
}
