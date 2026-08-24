const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const { naiwa } = require(path.join(
  projectRoot,
  "dist/characters/naiwa.js",
));

app.whenReady().then(async () => {
  const settings = {
    characterId: "naiwa",
    defaultPosition: "bottom-right",
    petScale: 1,
    summonShortcut: "CommandOrControl+Alt+P",
  };
  ipcMain.handle("pet:snapshot", () => ({
    character: naiwa,
    state: {
      action: "idle",
      facing: "right",
      isMoving: false,
      position: { x: 0, y: 0 },
    },
  }));
  ipcMain.handle("settings:get", () => ({
    characters: [{ id: naiwa.id, name: naiwa.name }],
    settings,
  }));
  ipcMain.handle("settings:update", (_event, next) => ({
    characters: [{ id: naiwa.id, name: naiwa.name }],
    settings: next,
  }));

  const window = new BrowserWindow({
    ...naiwa.size,
    frame: false,
    show: false,
    transparent: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(projectRoot, "dist/preload/index.js"),
      sandbox: true,
    },
  });

  const rendererErrors = [];
  window.webContents.on("console-message", (event) => {
    if (event.level === "error") {
      rendererErrors.push(event.message);
    }
  });

  await window.loadFile(path.join(projectRoot, "src/renderer/index.html"));
  await new Promise((resolve) => setTimeout(resolve, 1_200));

  const canvasState = await window.webContents.executeJavaScript(`(() => {
    const canvas = document.querySelector("#pet-canvas");
    return {
      height: canvas.height,
      width: canvas.width,
    };
  })()`);
  const screenshot = await window.webContents.capturePage();
  const bitmap = screenshot.toBitmap();
  let visiblePixels = 0;

  for (let offset = 3; offset < bitmap.length; offset += 4) {
    if (bitmap[offset] !== 0) {
      visiblePixels += 1;
    }
  }

  const settingsWindow = new BrowserWindow({
    width: 460,
    height: 500,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(projectRoot, "dist/preload/settings.js"),
      sandbox: true,
    },
  });
  settingsWindow.webContents.on("console-message", (event) => {
    if (event.level === "error") {
      rendererErrors.push(event.message);
    }
  });
  await settingsWindow.loadFile(path.join(projectRoot, "src/renderer/settings.html"));
  await new Promise((resolve) => setTimeout(resolve, 100));
  const settingsState = await settingsWindow.webContents.executeJavaScript(`(() => ({
    characterOptions: document.querySelector("#character").options.length,
    shortcut: document.querySelector("#summon-shortcut").value,
  }))()`);

  const result = {
    canvasState,
    rendererErrors,
    settingsState,
    visiblePixels,
  };
  console.log(JSON.stringify(result));

  if (
    rendererErrors.length > 0
    || canvasState.width !== naiwa.size.width
    || canvasState.height !== naiwa.size.height
    || settingsState.characterOptions !== 1
    || settingsState.shortcut !== settings.summonShortcut
    || visiblePixels < 1_000
  ) {
    app.exit(1);
    return;
  }

  app.quit();
});
