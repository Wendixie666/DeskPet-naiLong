const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const { naiwa } = require(path.join(
  projectRoot,
  "dist/characters/naiwa.js",
));

app.whenReady().then(async () => {
  ipcMain.handle("pet:snapshot", () => ({
    character: naiwa,
    state: {
      action: "idle",
      facing: "right",
      isMoving: false,
      position: { x: 0, y: 0 },
    },
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

  const imageState = await window.webContents.executeJavaScript(`(() => {
    const image = document.querySelector("#pet-image");
    return {
      naturalHeight: image.naturalHeight,
      naturalWidth: image.naturalWidth,
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

  const result = {
    imageState,
    rendererErrors,
    visiblePixels,
  };
  console.log(JSON.stringify(result));

  if (
    rendererErrors.length > 0
    || imageState.naturalWidth === 0
    || imageState.naturalHeight === 0
    || visiblePixels < 1_000
  ) {
    app.exit(1);
    return;
  }

  app.quit();
});
