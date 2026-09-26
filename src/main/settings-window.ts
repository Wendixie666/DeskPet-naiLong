import { app, BrowserWindow } from "electron";
import path from "node:path";

import { loadRendererPage } from "./window-loader";

let settingsWindow: BrowserWindow | undefined;

export function showSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 460,
    height: 720,
    minWidth: 420,
    minHeight: 620,
    title: "桌宠设置",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload/settings.js"),
      sandbox: false,
    },
  });
  settingsWindow.setMenuBarVisibility(false);
  void loadRendererPage(settingsWindow, "settings.html", app.getAppPath());
  settingsWindow.on("closed", () => {
    settingsWindow = undefined;
  });
}
