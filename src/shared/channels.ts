export const petChannels = {
  click: "pet:click",
  contextMenu: "pet:context-menu",
  dragBy: "pet:drag-by",
  dragEnd: "pet:drag-end",
  patEnd: "pet:pat-end",
  patStart: "pet:pat-start",
  snapshot: "pet:snapshot",
  snapshotChanged: "pet:snapshot-changed",
  state: "pet:state",
} as const;

export const settingsChannels = {
  get: "settings:get",
  save: "settings:save",
  themeChanged: "settings:theme-changed",
  update: "settings:update",
} as const;

export const aiSettingsChannels = {
  get: "ai-settings:get",
  update: "ai-settings:update",
  saveApiKey: "ai-settings:save-api-key",
  removeApiKey: "ai-settings:remove-api-key",
  test: "ai-settings:test",
} as const;

export const chatChannels = {
  getState: "chat:get-state",
  send: "chat:send",
  delta: "chat:delta",
  done: "chat:done",
  error: "chat:error",
  clear: "chat:clear",
  cancel: "chat:cancel",
} as const;

export const memoChannels = {
  list: "memo:list",
  create: "memo:create",
  updateText: "memo:update-text",
  updateDeadline: "memo:update-deadline",
  complete: "memo:complete",
  remove: "memo:remove",
} as const;

export const reminderOverlayChannels = {
  click: "reminder-overlay:click",
  hide: "reminder-overlay:hide",
  show: "reminder-overlay:show",
} as const;
