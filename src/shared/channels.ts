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
  update: "settings:update",
} as const;
