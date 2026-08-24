import type {
  AppSettings,
  DefaultPosition,
  SettingsSnapshot,
} from "../shared/types";

const form = document.querySelector<HTMLFormElement>("#settings-form")!;
const characterSelect = document.querySelector<HTMLSelectElement>("#character")!;
const scaleSelect = document.querySelector<HTMLSelectElement>("#pet-scale")!;
const themeSelect = document.querySelector<HTMLSelectElement>("#theme")!;
const shortcutInput = document.querySelector<HTMLInputElement>("#summon-shortcut")!;
const statusElement = document.querySelector<HTMLElement>("#status")!;
const submitButton = form.querySelector<HTMLButtonElement>("button[type=submit]")!;

let currentSettings: AppSettings;

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
  statusElement.classList.remove("error");
  statusElement.textContent = "正在保存…";
  try {
    const snapshot = await window.desktopSettings.update(next);
    showSnapshot(snapshot);
    statusElement.textContent = "已保存";
  } catch (error) {
    statusElement.classList.add("error");
    statusElement.textContent = error instanceof Error
      ? error.message
      : "保存失败";
  } finally {
    submitButton.disabled = false;
  }
});

window.desktopSettings.get().then(showSnapshot);
