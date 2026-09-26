import type { CharacterConfig } from "../shared/types";

export const danaiwa: CharacterConfig = {
  id: "danaiwa",
  name: "大奶蛙",
  assetRoot: "../../素材/大奶蛙/processed",
  chatUi: {
    title: "和大奶蛙聊聊天",
    emptyState: "跟大奶蛙说点什么吧",
  },
  size: { width: 192, height: 208 },
  speed: 260,
  visual: {
    contentHeight: 180,
    footAnchor: { x: 96, y: 202 },
  },
  interactionActions: {
    climb: "walk",
    drag: "drag",
    reminder: "reminder",
  },
  persona: {
    file: "danaiwa.md",
  },
  clickActions: ["wave", "jumping", "waiting", "review", "laugh"],
  trackingAction: "look",
  actions: {
    idle: {
      kind: "sprite",
      asset: "idle.processed.png",
      frameCount: 6,
      frameDurationMs: 180,
    },
    walk: {
      kind: "sprite",
      asset: "walk.processed.png",
      frameCount: 8,
      frameDurationMs: 100,
    },
    wave: {
      kind: "sprite",
      asset: "wave.processed.png",
      frameCount: 4,
      frameDurationMs: 140,
    },
    jumping: {
      kind: "sprite",
      asset: "jumping.processed.png",
      frameCount: 5,
      frameDurationMs: 140,
    },
    failed: {
      kind: "sprite",
      asset: "failed.processed.png",
      frameCount: 8,
      frameDurationMs: 140,
    },
    waiting: {
      kind: "sprite",
      asset: "waiting.processed.png",
      frameCount: 6,
      frameDurationMs: 140,
    },
    typing: {
      kind: "sprite",
      asset: "typing.processed.png",
      frameCount: 6,
      frameDurationMs: 120,
    },
    review: {
      kind: "sprite",
      asset: "review.processed.png",
      frameCount: 6,
      frameDurationMs: 140,
    },
    laugh: {
      kind: "sprite",
      asset: "laugh.processed.png",
      frameCount: 61,
      frameDurationMs: 20,
    },
    look: {
      kind: "directional-sprite",
      assets: ["look-up.processed.png", "look-down.processed.png"],
      frameCount: 8,
      frameDurationMs: 120,
      directionalMode: "direct-16",
    },
    drag: {
      kind: "image",
      asset: "drag.processed.png",
    },
    reminder: {
      kind: "sprite",
      asset: "failed.processed.png",
      frameCount: 8,
      frameDurationMs: 140,
      holdFrameIndex: 3,
    },
  },
};
