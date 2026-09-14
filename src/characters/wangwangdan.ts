import type { CharacterConfig } from "../shared/types";

export const wangwangdan: CharacterConfig = {
  id: "wangwangdan",
  name: "汪汪丹",
  assetRoot: "../../素材/汪汪丹/processed",
  size: { width: 192, height: 208 },
  speed: 260,
  visual: {
    contentHeight: 180,
    footAnchor: { x: 96, y: 202 },
  },
  clickActions: ["surprised", "dance"],
  actions: {
    idle: {
      kind: "image",
      asset: "惊讶第一帧.processed.png",
    },
    walk: {
      kind: "sprite",
      asset: "走路静态.processed.png",
      frameCount: 12,
      frameDurationMs: 90,
    },
    surprised: {
      kind: "sprite",
      asset: "惊讶静态.processed.png",
      frameCount: 12,
      frameDurationMs: 140,
    },
    dance: {
      kind: "sprite",
      asset: "跳舞静态.processed.png",
      frameCount: 12,
      frameDurationMs: 140,
    },
  },
};
