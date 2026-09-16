import type {
  AiConfig,
  AiSettingsSnapshot,
  AppSettings,
  DefaultPosition,
  SettingsSnapshot,
} from "../shared/types";

const form = document.querySelector<HTMLFormElement>("#settings-form")!;
const characterSelect = document.querySelector<HTMLSelectElement>("#character")!;
const scaleSelect = document.querySelector<HTMLSelectElement>("#pet-scale")!;
const themeSelect = document.querySelector<HTMLSelectElement>("#theme")!;
const shortcutInput = document.querySelector<HTMLInputElement>("#summon-shortcut")!;
const aiBaseUrlInput = document.querySelector<HTMLInputElement>("#ai-base-url")!;
const aiModelInput = document.querySelector<HTMLInputElement>("#ai-model")!;
const aiApiKeyInput = document.querySelector<HTMLInputElement>("#ai-api-key")!;
const aiKeyStatusElement = document.querySelector<HTMLElement>("#ai-key-status")!;
const aiStatusElement = document.querySelector<HTMLElement>("#ai-status")!;
const testAiButton = document.querySelector<HTMLButtonElement>("#test-ai")!;
const removeAiKeyButton = document.querySelector<HTMLButtonElement>("#remove-ai-key")!;
const statusElement = document.querySelector<HTMLElement>("#status")!;
const submitButton = form.querySelector<HTMLButtonElement>("button[type=submit]")!;

let currentSettings: AppSettings;
let currentAiSettings: AiSettingsSnapshot;

function showSnapshot(snapshot: SettingsSnapshot): void {
  document.documentElement.dataset.theme = snapshot.settings.theme;

  characterSelect.replaceChildren();
  for (const character of snapshot.characters) {
    const option = document.createElement("option");
    option.value = character.id;
    option.textContent = character.name;
    characterSelect.append(option);
  }

  scaleSelect.replaceChildren();
  for (const scale of snapshot.petScales) {
    const option = document.createElement("option");
    option.value = String(scale);
    option.textContent = `${Math.round(scale * 100)}%`;
    scaleSelect.append(option);
  }

  currentSettings = snapshot.settings;
  characterSelect.value = currentSettings.characterId;
  scaleSelect.value = String(currentSettings.petScale);
  themeSelect.value = currentSettings.theme;
  shortcutInput.value = currentSettings.summonShortcut;
  const positionInput = form.querySelector<HTMLInputElement>(
    `input[name=defaultPosition][value=${currentSettings.defaultPosition}]`,
  );
  if (positionInput) {
    positionInput.checked = true;
  }
}

function showAiSnapshot(snapshot: AiSettingsSnapshot): void {
  currentAiSettings = snapshot;
  aiBaseUrlInput.value = snapshot.config.baseUrl;
  aiModelInput.value = snapshot.config.model;
  aiApiKeyInput.value = "";
  aiKeyStatusElement.textContent = snapshot.hasApiKey ? "已配置" : "未配置";
  removeAiKeyButton.disabled = !snapshot.hasApiKey;
}

function readAiConfig(): AiConfig {
  return {
    provider: "openai-compatible",
    baseUrl: aiBaseUrlInput.value,
    model: aiModelInput.value,
  };
}

function showError(error: unknown): void {
  statusElement.classList.add("error");
  statusElement.textContent = error instanceof Error ? error.message : "加载失败";
}

function shouldSaveAiConfig(config: AiConfig): boolean {
  return config.model.trim().length > 0
    || config.baseUrl !== currentAiSettings.config.baseUrl;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const defaultPosition = formData.get("defaultPosition") as DefaultPosition;
  const next: AppSettings = {
    ...currentSettings,
    characterId: characterSelect.value,
    defaultPosition,
    petScale: Number(scaleSelect.value),
    summonShortcut: shortcutInput.value,
    theme: themeSelect.value as AppSettings["theme"],
  };

  submitButton.disabled = true;
  testAiButton.disabled = true;
  removeAiKeyButton.disabled = true;
  statusElement.classList.remove("error");
  statusElement.textContent = "正在保存…";
  try {
    const aiConfig = readAiConfig();
    let aiSnapshot = currentAiSettings;
    if (shouldSaveAiConfig(aiConfig) || aiApiKeyInput.value.trim()) {
      aiSnapshot = await window.desktopSettings.updateAiSettings(aiConfig);
    }
    if (aiApiKeyInput.value.trim()) {
      aiSnapshot = await window.desktopSettings.saveApiKey(aiApiKeyInput.value);
    }
    const snapshot = await window.desktopSettings.update(next);
    showSnapshot(snapshot);
    showAiSnapshot(aiSnapshot);
    statusElement.textContent = "已保存";
  } catch (error) {
    statusElement.classList.add("error");
    statusElement.textContent = error instanceof Error
      ? error.message
      : "保存失败";
  } finally {
    submitButton.disabled = false;
    testAiButton.disabled = false;
    removeAiKeyButton.disabled = !currentAiSettings?.hasApiKey;
  }
});

testAiButton.addEventListener("click", async () => {
  testAiButton.disabled = true;
  aiStatusElement.classList.remove("error");
  aiStatusElement.textContent = "正在测试…";
  try {
    const result = await window.desktopSettings.testAiConnection(
      readAiConfig(),
      aiApiKeyInput.value,
    );
    aiStatusElement.classList.toggle("error", !result.ok);
    aiStatusElement.textContent = result.message;
  } catch (error) {
    aiStatusElement.classList.add("error");
    aiStatusElement.textContent = error instanceof Error ? error.message : "测试失败";
  } finally {
    testAiButton.disabled = false;
  }
});

removeAiKeyButton.addEventListener("click", async () => {
  removeAiKeyButton.disabled = true;
  aiStatusElement.classList.remove("error");
  aiStatusElement.textContent = "正在删除…";
  try {
    const snapshot = await window.desktopSettings.removeApiKey();
    showAiSnapshot(snapshot);
    aiStatusElement.textContent = "API Key 已删除";
  } catch (error) {
    aiStatusElement.classList.add("error");
    aiStatusElement.textContent = error instanceof Error ? error.message : "删除失败";
    removeAiKeyButton.disabled = false;
  }
});

Promise.all([
  window.desktopSettings.get(),
  window.desktopSettings.getAiSettings(),
]).then(([snapshot, aiSnapshot]) => {
  showSnapshot(snapshot);
  showAiSnapshot(aiSnapshot);
}).catch(showError);
