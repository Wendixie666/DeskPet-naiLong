import { app, BrowserWindow } from "electron";
import path from "node:path";

import type { AppTheme } from "../shared/types";
import { settingsChannels } from "../shared/channels.ts";
import { loadRendererPage } from "./window-loader";

let memoWindow: BrowserWindow | undefined;

export function showMemoWindow(): void {
  if (memoWindow && !memoWindow.isDestroyed()) {
    memoWindow.focus();
    return;
  }

  memoWindow = new BrowserWindow({
    width: 560,
    height: 640,
    minWidth: 460,
    minHeight: 420,
    title: "奶蛙备忘录",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload/memo.js"),
      sandbox: false,
    },
  });
  memoWindow.setMenuBarVisibility(false);
  void loadRendererPage(memoWindow, "memo.html", app.getAppPath());
  memoWindow.on("closed", () => {
    memoWindow = undefined;
  });
}

export function notifyMemoTheme(theme: AppTheme): void {
  if (!memoWindow || memoWindow.isDestroyed()) {
    return;
  }
  memoWindow.webContents.send(settingsChannels.themeChanged, theme);
}
