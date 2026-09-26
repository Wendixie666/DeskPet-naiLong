import type { CharacterConfig } from "../shared/types";

export const xiaohei: CharacterConfig = {
  id: "xiaohei",
  name: "罗小黑",
  assetRoot: "../../素材/罗小黑/processed",
  chatUi: {
    title: "和罗小黑聊聊天",
    emptyState: "跟罗小黑说点什么吧",
  },
  size: { width: 200, height: 220 },
  speed: 260,
  visual: {
    contentHeight: 180,
    footAnchor: { x: 100, y: 210 },
  },
  interactionActions: {
    climb: "walk",
    drag: "wiggle",
  },
  persona: {
    file: "luoxiahei.md",
  },
  clickActions: ["wave", "playHeixiu"],
  actions: {
    idle: {
      kind: "image",
      asset: "idle-hd.png",
      adjustment: { scale: 0.87 },
    },
    walk: {
      kind: "sprite",
      asset: "walk.processed.png",
      frameCount: 12,
      frameDurationMs: 80,
    },
    wave: {
      kind: "sprite",
      asset: "wave.processed.png",
      frameCount: 34,
      frameDurationMs: 80,
    },
    playHeixiu: {
      kind: "sprite",
      asset: "play-heixiu.processed.png",
      frameCount: 8,
      frameDurationMs: 80,
    },
    wiggle: {
      kind: "sprite",
      asset: "wiggle.processed.png",
      frameCount: 11,
      frameDurationMs: 70,
    },
  },
};
