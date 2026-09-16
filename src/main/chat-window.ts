import { app, BrowserWindow } from "electron";
import path from "node:path";

let chatWindow: BrowserWindow | undefined;
let onChatWindowClosed: () => void = () => {};

export function setChatWindowCloseHandler(handler: () => void): void {
  onChatWindowClosed = handler;
}

export function showChatWindow(): void {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.focus();
    return;
  }

  chatWindow = new BrowserWindow({
    width: 640,
    height: 720,
    minWidth: 480,
    minHeight: 500,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload/chat.js"),
      sandbox: false,
    },
  });
  chatWindow.setMenuBarVisibility(false);
  chatWindow.loadFile(path.join(app.getAppPath(), "src/renderer/chat.html"));
  chatWindow.on("closed", () => {
    chatWindow = undefined;
    onChatWindowClosed();
  });
}
