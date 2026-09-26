import type {
  AiConfig,
  AiSettingsSnapshot,
  AppTheme,
  ChatMessage,
  ChatState,
} from "../shared/types";

const DEEPSEEK_CONFIG: AiConfig = {
  provider: "deepseek",
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-flash",
};
const OPENAI_CONFIG: AiConfig = {
  provider: "openai-compatible",
  baseUrl: "https://api.openai.com/v1",
  model: "",
};

const messagesElement = document.querySelector<HTMLElement>("#messages")!;
const titleElement = document.querySelector<HTMLElement>("#chat-title")!;
const emptyStateElement = document.querySelector<HTMLElement>("#empty-state")!;
const statusElement = document.querySelector<HTMLElement>("#status")!;
const form = document.querySelector<HTMLFormElement>("#chat-form")!;
const input = document.querySelector<HTMLTextAreaElement>("#message-input")!;
const sendButton = document.querySelector<HTMLButtonElement>("#send-message")!;
const stopButton = document.querySelector<HTMLButtonElement>("#stop-generation")!;
const clearButton = document.querySelector<HTMLButtonElement>("#clear-chat")!;
const openSettingsButton = document.querySelector<HTMLButtonElement>("#open-chat-settings")!;
const settingsPanel = document.querySelector<HTMLElement>("#chat-settings")!;
const settingsForm = document.querySelector<HTMLFormElement>("#chat-settings-form")!;
const providerSelect = document.querySelector<HTMLSelectElement>("#ai-provider")!;
const baseUrlInput = document.querySelector<HTMLInputElement>("#ai-base-url")!;
const modelInput = document.querySelector<HTMLInputElement>("#ai-model")!;
const apiKeyInput = document.querySelector<HTMLInputElement>("#ai-api-key")!;
const keyStatusElement = document.querySelector<HTMLElement>("#ai-key-status")!;
const aiStatusElement = document.querySelector<HTMLElement>("#ai-status")!;
const testAiButton = document.querySelector<HTMLButtonElement>("#test-ai")!;
const removeAiKeyButton = document.querySelector<HTMLButtonElement>("#remove-ai-key")!;
const saveAiButton = document.querySelector<HTMLButtonElement>("#save-ai")!;

let state: ChatState = {
  characterId: "",
  chatUi: {
    title: "角色聊天",
    emptyState: "暂无聊天记录",
  },
  messages: [],
  generating: false,
};
let streamingContent = "";
let hasError = false;
let currentAiSettings: AiSettingsSnapshot;

function applyTheme(theme: AppTheme): void {
  document.documentElement.dataset.theme = theme;
}

function showStatus(message: string, isError = false): void {
  statusElement.classList.toggle("error", isError);
  statusElement.textContent = message;
}

function showAiStatus(message: string, isError = false): void {
  aiStatusElement.classList.toggle("error", isError);
  aiStatusElement.textContent = message;
}

function showAiSnapshot(snapshot: AiSettingsSnapshot): void {
  currentAiSettings = snapshot;
  providerSelect.value = snapshot.config.provider;
  baseUrlInput.value = snapshot.config.baseUrl;
  modelInput.value = snapshot.config.model;
  apiKeyInput.value = "";
  keyStatusElement.textContent = snapshot.hasApiKey ? "API Key 已配置" : "未配置 API Key";
  removeAiKeyButton.disabled = !snapshot.hasApiKey;
}

function readAiConfig(): AiConfig {
  return {
    provider: providerSelect.value as AiConfig["provider"],
    baseUrl: baseUrlInput.value,
    model: modelInput.value,
  };
}

function setSettingsBusy(busy: boolean): void {
  testAiButton.disabled = busy;
  removeAiKeyButton.disabled = busy || !currentAiSettings?.hasApiKey;
  saveAiButton.disabled = busy;
}

function applyProviderPreset(): void {
  if (providerSelect.value === "deepseek") {
    if (!baseUrlInput.value || baseUrlInput.value === OPENAI_CONFIG.baseUrl) {
      baseUrlInput.value = DEEPSEEK_CONFIG.baseUrl;
    }
    if (!modelInput.value) {
      modelInput.value = DEEPSEEK_CONFIG.model;
    }
    return;
  }

  if (baseUrlInput.value === DEEPSEEK_CONFIG.baseUrl) {
    baseUrlInput.value = OPENAI_CONFIG.baseUrl;
  }
  if (modelInput.value === DEEPSEEK_CONFIG.model) {
    modelInput.value = OPENAI_CONFIG.model;
  }
}

function applyCharacterUi(): void {
  titleElement.textContent = state.chatUi.title;
  document.title = state.chatUi.title;
  emptyStateElement.textContent = state.chatUi.emptyState;
}

function renderMessage(item: ChatMessage): HTMLElement {
  const element = document.createElement("article");
  element.className = `message ${item.role}`;
  element.textContent = item.content;
  return element;
}

function render(): void {
  applyCharacterUi();
  messagesElement.replaceChildren(...state.messages.map(renderMessage));
  if (streamingContent) {
    const streamingMessage = document.createElement("article");
    streamingMessage.className = "message assistant";
    streamingMessage.textContent = streamingContent;
    messagesElement.append(streamingMessage);
  }
  emptyStateElement.hidden = state.messages.length > 0 || Boolean(streamingContent);
  stopButton.hidden = !state.generating;
  sendButton.disabled = state.generating;
  clearButton.disabled = state.generating;
  if (state.generating) {
    messagesElement.scrollTop = messagesElement.scrollHeight;
  }
}

function addPendingUserMessage(content: string): void {
  state = {
    ...state,
    generating: true,
    messages: [
      ...state.messages,
      {
        id: `pending-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      },
    ],
  };
  render();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const content = input.value.trim();
  if (!content || state.generating) {
    return;
  }
  input.value = "";
  streamingContent = "";
  hasError = false;
  showStatus("正在生成…");
  addPendingUserMessage(content);
  window.desktopChat.send(content).catch((error: unknown) => {
    state = { ...state, generating: false };
    showStatus(error instanceof Error ? error.message : "聊天失败", true);
    render();
  });
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

stopButton.addEventListener("click", () => {
  window.desktopChat.cancel();
  showStatus("正在停止…");
});

clearButton.addEventListener("click", () => {
  window.desktopChat.clear().then((nextState) => {
    state = nextState;
    streamingContent = "";
    hasError = false;
    showStatus("聊天记录已清空");
    render();
  }).catch((error: unknown) => {
    showStatus(error instanceof Error ? error.message : "清空失败", true);
  });
});

openSettingsButton.addEventListener("click", () => {
  const open = settingsPanel.hidden;
  settingsPanel.hidden = !open;
  openSettingsButton.setAttribute("aria-expanded", String(open));
  if (open) {
    baseUrlInput.focus();
  }
});

providerSelect.addEventListener("change", applyProviderPreset);

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setSettingsBusy(true);
  showAiStatus("正在保存…");
  try {
    currentAiSettings = await window.desktopChat.saveAiSettings(
      readAiConfig(),
      apiKeyInput.value,
    );
    showAiSnapshot(currentAiSettings);
    showAiStatus("已保存");
  } catch (error) {
    showAiStatus(error instanceof Error ? error.message : "保存失败", true);
  } finally {
    setSettingsBusy(false);
  }
});

testAiButton.addEventListener("click", async () => {
  setSettingsBusy(true);
  showAiStatus("正在测试…");
  try {
    const result = await window.desktopChat.testAiConnection(readAiConfig(), apiKeyInput.value);
    showAiStatus(result.message, !result.ok);
  } catch (error) {
    showAiStatus(error instanceof Error ? error.message : "测试失败", true);
  } finally {
    setSettingsBusy(false);
  }
});

removeAiKeyButton.addEventListener("click", async () => {
  setSettingsBusy(true);
  showAiStatus("正在删除…");
  try {
    currentAiSettings = await window.desktopChat.removeApiKey();
    showAiSnapshot(currentAiSettings);
    showAiStatus("API Key 已删除");
  } catch (error) {
    showAiStatus(error instanceof Error ? error.message : "删除失败", true);
  } finally {
    setSettingsBusy(false);
  }
});

window.desktopChat.onDelta((delta) => {
  streamingContent += delta;
  render();
});

window.desktopChat.onDone((nextState) => {
  state = nextState;
  streamingContent = "";
  if (!state.generating && !hasError) {
    showStatus("");
  }
  hasError = false;
  render();
});

window.desktopChat.onError((message, nextState) => {
  state = nextState;
  streamingContent = "";
  hasError = true;
  showStatus(message, true);
  render();
});

Promise.all([
  window.desktopChat.getState(),
  window.desktopChat.getTheme(),
  window.desktopChat.getAiSettings(),
]).then(([nextState, theme, aiSettings]) => {
  state = nextState;
  showAiSnapshot(aiSettings);
  applyTheme(theme);
  render();
  input.focus();
}).catch((error: unknown) => {
  showStatus(error instanceof Error ? error.message : "聊天初始化失败", true);
});

window.desktopChat.onThemeChanged(applyTheme);
