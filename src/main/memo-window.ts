import { app, BrowserWindow } from "electron";
import path from "node:path";

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
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload/memo.js"),
      sandbox: false,
    },
  });
  memoWindow.setMenuBarVisibility(false);
  memoWindow.loadFile(path.join(app.getAppPath(), "src/renderer/memo.html"));
  memoWindow.on("closed", () => {
    memoWindow = undefined;
  });
}
