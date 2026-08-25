export const petChannels = {
  click: "pet:click",
  contextMenu: "pet:context-menu",
  dragBy: "pet:drag-by",
  snapshot: "pet:snapshot",
  snapshotChanged: "pet:snapshot-changed",
  state: "pet:state",
} as const;

export const settingsChannels = {
  get: "settings:get",
  update: "settings:update",
} as const;
