import type { AppTheme, ChatMessage, ChatState } from "../shared/types";

const messagesElement = document.querySelector<HTMLElement>("#messages")!;
const titleElement = document.querySelector<HTMLElement>("#chat-title")!;
const emptyStateElement = document.querySelector<HTMLElement>("#empty-state")!;
const statusElement = document.querySelector<HTMLElement>("#status")!;
const form = document.querySelector<HTMLFormElement>("#chat-form")!;
const input = document.querySelector<HTMLTextAreaElement>("#message-input")!;
const sendButton = document.querySelector<HTMLButtonElement>("#send-message")!;
const stopButton = document.querySelector<HTMLButtonElement>("#stop-generation")!;
const clearButton = document.querySelector<HTMLButtonElement>("#clear-chat")!;

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

function applyTheme(theme: AppTheme): void {
  document.documentElement.dataset.theme = theme;
}

function showStatus(message: string, isError = false): void {
  statusElement.classList.toggle("error", isError);
  statusElement.textContent = message;
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
]).then(([nextState, theme]) => {
  state = nextState;
  applyTheme(theme);
  render();
  input.focus();
}).catch((error: unknown) => {
  showStatus(error instanceof Error ? error.message : "聊天初始化失败", true);
});

window.desktopChat.onThemeChanged(applyTheme);
