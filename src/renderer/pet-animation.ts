import type {
  CharacterAction,
  CharacterConfig,
  PetSnapshot,
  PetState,
  VisualAdjustment,
} from "../shared/types";
import type { DirectionalSpriteAction } from "../shared/types";
import type { LookDirection } from "../pet/look-direction";
import { createPetAssetLoader, type PetAssetLoader } from "./pet-assets.ts";

export interface PetAnimator {
  render(state: PetState): void;
  show(snapshot: PetSnapshot): void;
}

export interface DirectionalFrame {
  assetIndex: 0 | 1;
  frameIndex: number;
  mirrored: boolean;
}

export function directionFrame(
  action: DirectionalSpriteAction,
  direction: LookDirection,
): DirectionalFrame {
  const lastFrame = action.frameCount - 1;
  const frameByDirection: Record<LookDirection, DirectionalFrame> = {
    up: { assetIndex: 0, frameIndex: 0, mirrored: false },
    "up-near-right": { assetIndex: 0, frameIndex: 2, mirrored: false },
    "up-right": { assetIndex: 0, frameIndex: 4, mirrored: false },
    "right-near-up": { assetIndex: 0, frameIndex: 6, mirrored: false },
    right: { assetIndex: 0, frameIndex: lastFrame, mirrored: false },
    "right-near-down": { assetIndex: 1, frameIndex: 6, mirrored: false },
    "down-right": { assetIndex: 1, frameIndex: 4, mirrored: false },
    "down-near-right": { assetIndex: 1, frameIndex: 2, mirrored: false },
    down: { assetIndex: 1, frameIndex: 0, mirrored: false },
    "down-near-left": { assetIndex: 1, frameIndex: 2, mirrored: true },
    "down-left": { assetIndex: 1, frameIndex: 4, mirrored: true },
    "left-near-down": { assetIndex: 1, frameIndex: 6, mirrored: true },
    left: { assetIndex: 0, frameIndex: lastFrame, mirrored: true },
    "left-near-up": { assetIndex: 0, frameIndex: 6, mirrored: true },
    "up-left": { assetIndex: 0, frameIndex: 4, mirrored: true },
    "up-near-left": { assetIndex: 0, frameIndex: 2, mirrored: true },
  };
  return frameByDirection[direction];
}

export function introFrames(action: DirectionalSpriteAction): DirectionalFrame[] {
  const lastFrame = action.frameCount - 1;
  return [
    ...Array.from({ length: action.frameCount }, (_, frameIndex) => ({
      assetIndex: 1 as const,
      frameIndex,
      mirrored: false,
    })),
    ...Array.from({ length: action.frameCount }, (_, frameIndex) => ({
      assetIndex: 0 as const,
      frameIndex,
      mirrored: false,
    })),
    ...Array.from({ length: action.frameCount }, (_, frameIndex) => ({
      assetIndex: 0 as const,
      frameIndex: lastFrame - frameIndex,
      mirrored: true,
    })),
    ...Array.from({ length: action.frameCount }, (_, frameIndex) => ({
      assetIndex: 1 as const,
      frameIndex: lastFrame - frameIndex,
      mirrored: true,
    })),
  ];
}

export function createPetAnimator(canvas: HTMLCanvasElement): PetAnimator {
  const context = canvas.getContext("2d")!;
  let character: CharacterConfig;
  let animationId = 0;
  let renderedAction: CharacterAction | undefined;
  let renderedActionSequence = -1;
  let renderedState: PetState | undefined;
  let assetLoader: PetAssetLoader;

  function visualPlacement(
    sourceWidth: number,
    sourceHeight: number,
    adjustment: VisualAdjustment = {},
  ) {
    const adjustmentScale = adjustment.scale ?? 1;
    const offset = adjustment.offset ?? { x: 0, y: 0 };
    const scale = character.visual.contentHeight / sourceHeight * adjustmentScale;
    return {
      scale,
      x: character.visual.footAnchor.x - sourceWidth / 2 * scale + offset.x,
      y: character.visual.footAnchor.y - sourceHeight * scale + offset.y,
    };
  }

  function drawFrame(
    source: HTMLImageElement,
    action: CharacterAction,
    frameIndex: number,
  ): void {
    const frameCount = action.kind === "sprite" ? action.frameCount : 1;
    const sourceWidth = source.naturalWidth / frameCount;
    const placement = visualPlacement(sourceWidth, source.naturalHeight, action.adjustment);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      source,
      sourceWidth * frameIndex,
      0,
      sourceWidth,
      source.naturalHeight,
      placement.x,
      placement.y,
      sourceWidth * placement.scale,
      source.naturalHeight * placement.scale,
    );
  }

  function playAction(action: CharacterAction, ownAnimationId: number): void {
    assetLoader.load(action).then((sources) => {
      const startedAt = performance.now();
      const intro = action.kind === "directional-sprite"
        ? introFrames(action)
        : [];
      const introDuration = intro.length * (action.kind === "directional-sprite"
        ? action.frameDurationMs
        : 0);

      function draw(now: number): void {
        if (animationId !== ownAnimationId) {
          return;
        }
        const elapsed = now - startedAt;
        if (action.kind === "directional-sprite") {
          const frame = elapsed < introDuration
            ? intro[Math.floor(elapsed / action.frameDurationMs)]
            : directionFrame(action, renderedState?.lookDirection ?? "right");
          drawDirectionalFrame(sources, action, frame);
        } else if (action.kind === "sprite") {
          drawFrame(
            sources[0],
            action,
            Math.floor(elapsed / action.frameDurationMs) % action.frameCount,
          );
        } else {
          drawFrame(sources[0], action, 0);
        }
        requestAnimationFrame(draw);
      }

      requestAnimationFrame(draw);
    }).catch((error: unknown) => {
      if (animationId === ownAnimationId) {
        console.error(error);
      }
    });
  }

  function drawDirectionalFrame(
    sources: HTMLImageElement[],
    action: DirectionalSpriteAction,
    frame: { assetIndex: number; frameIndex: number; mirrored: boolean },
  ): void {
    const source = sources[frame.assetIndex];
    const sourceWidth = source.naturalWidth / action.frameCount;
    const placement = visualPlacement(sourceWidth, source.naturalHeight, action.adjustment);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    if (frame.mirrored) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(
      source,
      sourceWidth * frame.frameIndex,
      0,
      sourceWidth,
      source.naturalHeight,
      placement.x,
      placement.y,
      sourceWidth * placement.scale,
      source.naturalHeight * placement.scale,
    );
    context.restore();
  }

  function render(state: PetState): void {
    const action = character.actions[state.action] ?? character.actions.idle;
    renderedState = state;
    const followsMouse = action.kind === "directional-sprite";
    canvas.classList.toggle("facing-left", followsMouse ? false : state.facing === "left");
    if (action === renderedAction && state.actionSequence === renderedActionSequence) {
      return;
    }
    renderedAction = action;
    renderedActionSequence = state.actionSequence;
    animationId += 1;
    playAction(action, animationId);
  }

  return {
    render,
    show(snapshot) {
      character = snapshot.character;
      assetLoader = createPetAssetLoader(character.assetRoot);
      canvas.width = character.size.width;
      canvas.height = character.size.height;
      renderedAction = undefined;
      render(snapshot.state);
    },
  };
}
