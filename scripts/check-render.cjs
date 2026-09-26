const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const renderCharacter = process.env.DESKPET_RENDER_CHARACTER;
const characterModuleName = renderCharacter === "danaiwa" || renderCharacter === "xiaohei"
  ? renderCharacter
  : "naiwa";
const character = require(path.join(
  projectRoot,
  `dist/characters/${characterModuleName}.js`,
))[characterModuleName];
const chatUi = character.chatUi;

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
    characterId: character.id,
    defaultPosition: "bottom-right",
    petScale: 1,
    summonShortcut: "CommandOrControl+Alt+P",
    theme: "light",
  };
  ipcMain.handle("pet:snapshot", () => ({
    character,
    state: {
      action: "idle",
      facing: "right",
      isMoving: false,
      position: { x: 0, y: 0 },
    },
  }));
  ipcMain.handle("settings:get", () => ({
    characters: [{ id: character.id, name: character.name }],
    petScales: [0.75, 1, 1.25, 1.5],
    settings,
  }));
  ipcMain.handle("settings:update", (_event, next) => ({
    characters: [{ id: character.id, name: character.name }],
    petScales: [0.75, 1, 1.25, 1.5],
    settings: next,
  }));
  ipcMain.handle("ai-settings:get", () => ({
    config: {
      provider: "openai-compatible",
      baseUrl: "https://api.openai.com/v1",
      model: "",
    },
    hasApiKey: false,
  }));
  ipcMain.handle("chat:get-state", () => ({
    characterId: character.id,
    chatUi,
    messages: [],
    generating: false,
  }));
  ipcMain.handle("chat:clear", () => ({
    characterId: character.id,
    chatUi,
    messages: [],
    generating: false,
  }));
  ipcMain.handle("chat:send", () => {});
  ipcMain.on("chat:cancel", () => {});
  ipcMain.handle("memo:list", () => []);

  const window = new BrowserWindow({
    ...character.size,
    frame: false,
    show: false,
    transparent: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(projectRoot, "dist/preload/index.js"),
      sandbox: false,
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
  window.webContents.send("pet:state", {
    action: character.trackingAction ?? "idle",
    facing: "right",
    isMoving: false,
    lookDirection: "up",
    position: { x: 0, y: 0 },
  });
  await new Promise((resolve) => setTimeout(resolve, 200));
  const lookVisiblePixels = await visiblePixelCount(window);
  let laughVisiblePixels = 0;
  if (character.actions.laugh) {
    window.webContents.send("pet:state", {
      action: "laugh",
      facing: "right",
      isMoving: false,
      position: { x: 0, y: 0 },
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    laughVisiblePixels = await visiblePixelCount(window);
  }
  window.webContents.send("pet:state", {
    action: "reminder",
    facing: "right",
    isMoving: false,
    position: { x: 0, y: 0 },
  });
  await new Promise((resolve) => setTimeout(resolve, 600));
  const reminderVisiblePixels = await visiblePixelCount(window);

  const settingsWindow = new BrowserWindow({
    width: 460,
    height: 500,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(projectRoot, "dist/preload/settings.js"),
      sandbox: false,
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

  const memoWindow = new BrowserWindow({
    width: 560,
    height: 640,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(projectRoot, "dist/preload/memo.js"),
      sandbox: false,
    },
  });
  memoWindow.webContents.on("console-message", (event) => {
    if (event.level === "error") {
      rendererErrors.push(event.message);
    }
  });
  await memoWindow.loadFile(path.join(projectRoot, "src/renderer/memo.html"));
  await new Promise((resolve) => setTimeout(resolve, 100));
  const memoState = await memoWindow.webContents.executeJavaScript(`(() => ({
    title: document.querySelector("h1").textContent,
    newTodoButton: document.querySelector("#new-todo").textContent,
  }))()`);

  const chatWindow = new BrowserWindow({
    width: 640,
    height: 720,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(projectRoot, "dist/preload/chat.js"),
      sandbox: false,
    },
  });
  chatWindow.webContents.on("console-message", (event) => {
    if (event.level === "error") {
      rendererErrors.push(event.message);
    }
  });
  await chatWindow.loadFile(path.join(projectRoot, "src/renderer/chat.html"));
  await new Promise((resolve) => setTimeout(resolve, 100));
  const chatState = await chatWindow.webContents.executeJavaScript(`(() => ({
    emptyState: document.querySelector("#empty-state").textContent,
    placeholder: document.querySelector("#message-input").getAttribute("placeholder"),
    title: document.querySelector("h1").textContent,
    sendButton: document.querySelector("#send-message").textContent,
  }))()`);
  const chatWindowTitle = chatWindow.getTitle();

  const reminderWindow = new BrowserWindow({
    width: 280,
    height: 88,
    show: false,
    transparent: true,
    frame: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(projectRoot, "dist/preload/reminder-overlay.js"),
      sandbox: false,
    },
  });
  reminderWindow.webContents.on("console-message", (event) => {
    if (event.level === "error") {
      rendererErrors.push(event.message);
    }
  });
  await reminderWindow.loadFile(path.join(projectRoot, "src/renderer/reminder-overlay.html"));
  reminderWindow.webContents.send("reminder-overlay:show", "改论文");
  await new Promise((resolve) => setTimeout(resolve, 100));
  const reminderState = await reminderWindow.webContents.executeJavaScript(`(() => ({
    hidden: document.querySelector("#reminder-card").hidden,
    text: document.querySelector("#reminder-text").textContent,
  }))()`);

  const result = {
    canvasState,
    facingLeft,
    rendererErrors,
    settingsState,
    memoState,
    chatState,
    chatWindowTitle,
    reminderState,
    visiblePixels,
    reminderVisiblePixels,
    walkVisiblePixels,
    lookVisiblePixels,
    laughVisiblePixels,
  };
  console.log(JSON.stringify(result));

  if (
    rendererErrors.length > 0
    || canvasState.width !== character.size.width
    || canvasState.height !== character.size.height
    || settingsState.characterOptions !== 1
    || settingsState.shortcut !== settings.summonShortcut
    || memoState.title !== "备忘录"
    || chatState.title !== chatUi.title
    || chatWindowTitle !== chatUi.title
    || chatState.emptyState !== chatUi.emptyState
    || chatState.placeholder !== "输入消息，按 Enter 发送…"
    || chatState.sendButton !== "发送"
    || reminderState.hidden
    || reminderState.text !== "你「改论文」了吗？"
    || visiblePixels < 1_000
    || !facingLeft
    || reminderVisiblePixels < 1_000
    || walkVisiblePixels < 1_000
    || (character.trackingAction !== undefined && lookVisiblePixels < 1_000)
    || (character.actions.laugh !== undefined && laughVisiblePixels < 1_000)
  ) {
    app.exit(1);
    return;
  }

  app.quit();
});
