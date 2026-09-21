import type { CharacterConfig } from "../shared/types";

export const lulu: CharacterConfig = {
  id: "lulu",
  name: "噜噜",
  assetRoot: "../../素材/噜噜",
  chatUi: {
    title: "和噜噜聊聊天",
    emptyState: "跟噜噜说点什么吧",
  },
  size: { width: 360, height: 324 },
  speed: 260,
  visual: {
    contentHeight: 280,
    footAnchor: { x: 180, y: 315 },
    headInteraction: { x: 60, y: 20, width: 240, height: 120 },
  },
  interactionActions: {
    climb: "walk",
    drag: "drag",
    pat: "wave",
  },
  persona: {
    file: "lulu.md",
  },
  clickActions: ["wave"],
  actions: {
    idle: {
      kind: "image",
      asset: "默认状态.png",
    },
    walk: {
      kind: "sprite",
      asset: "跑步.png",
      frameCount: 8,
      frameDurationMs: 90,
    },
    wave: {
      kind: "sprite",
      asset: "打招呼.png",
      frameCount: 6,
      frameDurationMs: 140,
    },
    drag: {
      kind: "image",
      asset: "被提起.png",
    },
    typing: {
      kind: "sprite",
      asset: "打字.png",
      frameCount: 6,
      frameDurationMs: 120,
    },
  },
};
