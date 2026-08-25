import { app, BrowserWindow } from "electron";
import path from "node:path";

let settingsWindow: BrowserWindow | undefined;

export function showSettingsWindow(): void {
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
      sandbox: false,
    },
  });
  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadFile(path.join(app.getAppPath(), "src/renderer/settings.html"));
  settingsWindow.on("closed", () => {
    settingsWindow = undefined;
  });
}
