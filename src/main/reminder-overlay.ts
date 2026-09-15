import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";

import type { Bounds, Point, Size } from "../shared/types";
import { reminderOverlayChannels } from "../shared/channels.ts";
import { reminderOverlayPosition } from "./reminder-overlay-position.ts";

export const REMINDER_OVERLAY_SIZE: Size = { width: 280, height: 88 };

interface ReminderOverlayAnchor {
  getBounds(): Bounds;
  workAreaAt(point: Point): Bounds;
}

interface ReminderOverlayOptions {
  anchor: ReminderOverlayAnchor;
  onClick(): void;
  onError(): void;
}

export interface ReminderOverlay {
  dispose(): void;
  hide(): void;
  show(text: string): void;
  syncPosition(): void;
}

export { reminderOverlayPosition } from "./reminder-overlay-position.ts";

export function createReminderOverlay(
  options: ReminderOverlayOptions,
): ReminderOverlay {
  const window = new BrowserWindow({
    ...REMINDER_OVERLAY_SIZE,
    alwaysOnTop: true,
    backgroundColor: "#00000000",
    focusable: false,
    frame: false,
    hasShadow: false,
    resizable: false,
    show: false,
    skipTaskbar: true,
    transparent: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload/reminder-overlay.js"),
      sandbox: false,
    },
  });
  let ready = false;
  let message: string | undefined;
  let disposed = false;

  if (process.platform === "darwin") {
    window.setAlwaysOnTop(true, "screen-saver");
    window.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
  }

  function syncPosition(): void {
    if (disposed || window.isDestroyed()) {
      return;
    }
    const bounds = options.anchor.getBounds();
    const position = reminderOverlayPosition(
      bounds,
      options.anchor.workAreaAt({
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      }),
      REMINDER_OVERLAY_SIZE,
    );
    window.setPosition(position.x, position.y);
  }

  function render(): void {
    if (!ready || disposed || window.isDestroyed()) {
      return;
    }
    if (message === undefined) {
      window.webContents.send(reminderOverlayChannels.hide);
      window.hide();
      return;
    }
    syncPosition();
    window.webContents.send(reminderOverlayChannels.show, message);
    window.showInactive();
  }

  const clickHandler = (event: Electron.IpcMainEvent) => {
    if (event.sender !== window.webContents) {
      return;
    }
    message = undefined;
    window.hide();
    options.onClick();
  };
  ipcMain.on(reminderOverlayChannels.click, clickHandler);
  window.webContents.once("did-finish-load", () => {
    ready = true;
    render();
  });
  void window.loadFile(path.join(app.getAppPath(), "src/renderer/reminder-overlay.html"))
    .catch((error: unknown) => {
      console.error("提醒卡片窗口加载失败", error);
      options.onError();
    });

  window.on("closed", () => {
    disposed = true;
    ipcMain.removeListener(reminderOverlayChannels.click, clickHandler);
  });

  return {
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      ipcMain.removeListener(reminderOverlayChannels.click, clickHandler);
      if (!window.isDestroyed()) {
        window.destroy();
      }
    },

    hide() {
      message = undefined;
      render();
    },

    show(text) {
      message = text;
      render();
    },

    syncPosition,
  };
}
