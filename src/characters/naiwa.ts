import type { CharacterConfig } from "../shared/types";

export const naiwa: CharacterConfig = {
  id: "naiwa",
  name: "奶蛙",
  assetRoot: "../../素材/奶蛙",
  size: { width: 192, height: 208 },
  speed: 260,
  visual: {
    contentHeight: 180,
    footAnchor: { x: 96, y: 202 },
  },
  clickActions: ["wave", "heart", "egg", "poop", "turnHead"],
  trackingAction: "turnHead",
  actions: {
    idle: {
      kind: "image",
      asset: "all-states.gif",
    },
    walk: {
      kind: "sprite",
      asset: "走路静态.png",
      frameCount: 8,
      frameDurationMs: 90,
    },
    wave: {
      kind: "sprite",
      asset: "打招呼静态.png",
      frameCount: 4,
      frameDurationMs: 140,
    },
    heart: {
      kind: "sprite",
      asset: "比心静态.png",
      frameCount: 6,
      frameDurationMs: 140,
    },
    egg: {
      kind: "sprite",
      asset: "蛋静态.png",
      frameCount: 5,
      frameDurationMs: 140,
    },
    poop: {
      kind: "sprite",
      asset: "粑粑静态.png",
      frameCount: 8,
      frameDurationMs: 140,
    },
    turnHead: {
      kind: "directional-sprite",
      assets: ["转头-上右.png", "转头-下右.png"],
      frameCount: 8,
      frameDurationMs: 120,
    },
  },
};
