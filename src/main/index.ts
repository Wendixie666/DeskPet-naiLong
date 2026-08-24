import { app, BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";

import { naiwa } from "../characters/naiwa";
import {
  createInteractionController,
  type InteractionController,
} from "../interaction/controller";
import { createPetController } from "../pet/controller";

let petWindow: BrowserWindow | undefined;
let interaction: InteractionController | undefined;
let animationTimer: NodeJS.Timeout | undefined;

export function summon(x: number, y: number): void {
  interaction?.summon(x, y);
}

function createPetWindow(): void {
  const { workArea } = screen.getPrimaryDisplay();
  const x = workArea.x + workArea.width - naiwa.size.width - 24;
  const y = workArea.y + workArea.height - naiwa.size.height - 24;

  petWindow = new BrowserWindow({
    ...naiwa.size,
    x,
    y,
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

  const pet = createPetController({
    clickActions: naiwa.clickActions,
    initialPosition: { x, y },
    size: naiwa.size,
    speed: naiwa.speed,
  });

  interaction = createInteractionController({
    pet,
    window: petWindow,
    onStateChange(state) {
      petWindow?.webContents.send("pet:state", state);
    },
  });

  ipcMain.handle("pet:snapshot", () => ({
    character: naiwa,
    state: pet.getState(),
  }));
  ipcMain.on("pet:click", () => interaction?.click());
  ipcMain.on("pet:drag-by", (_event, deltaX: number, deltaY: number) => {
    interaction?.dragBy(deltaX, deltaY);
  });
  ipcMain.on("pet:summon", (_event, targetX: number, targetY: number) => {
    summon(targetX, targetY);
  });

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
    ipcMain.removeHandler("pet:snapshot");
    ipcMain.removeAllListeners("pet:click");
    ipcMain.removeAllListeners("pet:drag-by");
    ipcMain.removeAllListeners("pet:summon");
    interaction = undefined;
    petWindow = undefined;
  });
}

app.whenReady().then(() => {
  createPetWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createPetWindow();
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
