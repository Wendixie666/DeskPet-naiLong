import type { CharacterAction } from "../shared/types";

export interface AssetImage {
  naturalHeight: number;
  naturalWidth: number;
  addEventListener(
    type: "error" | "load",
    listener: () => void,
    options?: { once?: boolean },
  ): void;
  src: string;
}

export interface PetAssetLoader<T extends AssetImage = HTMLImageElement> {
  load(action: CharacterAction): Promise<T[]>;
}

export function createPetAssetLoader(
  assetRoot: string,
): PetAssetLoader<HTMLImageElement>;
export function createPetAssetLoader<T extends AssetImage>(
  assetRoot: string,
  createImage: () => T,
): PetAssetLoader<T>;
export function createPetAssetLoader<T extends AssetImage>(
  assetRoot: string,
  createImage: () => T = () => new Image() as unknown as T,
): PetAssetLoader<T> {
  function loadAsset(asset: string): Promise<T> {
    const source = createImage();
    return new Promise((resolve, reject) => {
      source.addEventListener("load", () => resolve(source), { once: true });
      source.addEventListener("error", () => {
        reject(new Error(`角色素材加载失败：${asset}`));
      }, { once: true });
      source.src = `${assetRoot}/${encodeURIComponent(asset)}`;
    });
  }

  return {
    load(action) {
      const assets = action.kind === "directional-sprite"
        ? action.assets
        : [action.asset];
      return Promise.all(assets.map(loadAsset));
    },
  };
}
