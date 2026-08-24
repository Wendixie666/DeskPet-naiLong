import assert from "node:assert/strict";
import test from "node:test";

import type { CharacterAction } from "../shared/types.ts";
import {
  createPetAssetLoader,
  type AssetImage,
} from "./pet-assets.ts";

class FakeImage implements AssetImage {
  naturalHeight = 100;
  naturalWidth = 200;
  src = "";
  private listeners = new Map<string, () => void>();

  addEventListener(
    type: "error" | "load",
    listener: () => void,
  ): void {
    this.listeners.set(type, listener);
  }

  load(): void {
    this.listeners.get("load")?.();
  }

  fail(): void {
    this.listeners.get("error")?.();
  }
}

function imageFactory(images: FakeImage[]): () => FakeImage {
  return () => {
    const image = new FakeImage();
    images.push(image);
    return image;
  };
}

test("资产加载 module 根据动作加载素材并编码路径", async () => {
  const images: FakeImage[] = [];
  const loader = createPetAssetLoader(
    "../../素材/奶蛙/processed",
    imageFactory(images),
  );
  const action: CharacterAction = {
    kind: "sprite",
    asset: "打招呼静态.processed.png",
    frameCount: 4,
    frameDurationMs: 140,
  };

  const loading = loader.load(action);
  images[0].load();
  const loaded = await loading;

  assert.equal(loaded[0], images[0]);
  assert.equal(
    images[0].src,
    "../../素材/奶蛙/processed/%E6%89%93%E6%8B%9B%E5%91%BC%E9%9D%99%E6%80%81.processed.png",
  );
});

test("资产加载 module 支持方向动作的多素材加载", async () => {
  const images: FakeImage[] = [];
  const loader = createPetAssetLoader("assets", imageFactory(images));
  const action: CharacterAction = {
    kind: "directional-sprite",
    assets: ["up.png", "down.png"],
    frameCount: 8,
    frameDurationMs: 120,
  };

  const loading = loader.load(action);
  images.forEach((image) => image.load());
  const loaded = await loading;

  assert.deepEqual(loaded, images);
  assert.deepEqual(images.map((image) => image.src), [
    "assets/up.png",
    "assets/down.png",
  ]);
});

test("素材加载失败时返回错误", async () => {
  const images: FakeImage[] = [];
  const loader = createPetAssetLoader("assets", imageFactory(images));
  const loading = loader.load({
    kind: "image",
    asset: "idle.gif",
  });
  images[0].fail();

  await assert.rejects(loading, /角色素材加载失败：idle.gif/);
});
