const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const { naiwa } = require(path.join(
  projectRoot,
  "dist/characters/naiwa.js",
));

app.whenReady().then(async () => {
  async function visiblePixelCount(targetWindow) {
    const screenshot = await targetWindow.webContents.capturePage();
    const bitmap = screenshot.toBitmap();
    let count = 0;
    for (let offset = 3; offset < bitmap.length; offset += 4) {
      if (bitmap[offset] !== 0) {
        count += 1;
      }
    }
    return count;
  }

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
    petScales: [0.75, 1, 1.25, 1.5],
    settings,
  }));
  ipcMain.handle("settings:update", (_event, next) => ({
    characters: [{ id: naiwa.id, name: naiwa.name }],
    petScales: [0.75, 1, 1.25, 1.5],
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
  const visiblePixels = await visiblePixelCount(window);

  window.webContents.send("pet:state", {
    action: "walk",
    facing: "left",
    isMoving: true,
    position: { x: 0, y: 0 },
  });
  let walkVisiblePixels = 0;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    walkVisiblePixels = await visiblePixelCount(window);
    if (walkVisiblePixels >= 1_000) {
      break;
    }
  }
  const facingLeft = await window.webContents.executeJavaScript(
    'document.querySelector("#pet-canvas").classList.contains("facing-left")',
  );

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
    facingLeft,
    rendererErrors,
    settingsState,
    visiblePixels,
    walkVisiblePixels,
  };
  console.log(JSON.stringify(result));

  if (
    rendererErrors.length > 0
    || canvasState.width !== naiwa.size.width
    || canvasState.height !== naiwa.size.height
    || settingsState.characterOptions !== 1
    || settingsState.shortcut !== settings.summonShortcut
    || visiblePixels < 1_000
    || !facingLeft
    || walkVisiblePixels < 1_000
  ) {
    app.exit(1);
    return;
  }

  app.quit();
});
