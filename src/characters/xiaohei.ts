import type { CharacterConfig } from "../shared/types";

export const xiaohei: CharacterConfig = {
  id: "xiaohei",
  name: "罗小黑",
  assetRoot: "../../素材/罗小黑",
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
      asset: "main-base.png",
    },
    walk: {
      kind: "image",
      asset: "main-run.gif",
    },
    wave: {
      kind: "image",
      asset: "main-wave.gif",
    },
    playHeixiu: {
      kind: "image",
      asset: "main-play-heixiu.gif",
    },
    wiggle: {
      kind: "image",
      asset: "main-wiggle.gif",
    },
  },
};
