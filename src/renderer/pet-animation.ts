import type {
  Bounds,
  CharacterAction,
  CharacterConfig,
  PetSnapshot,
  PetState,
  VisualAdjustment,
} from "../shared/types";

export interface PetAnimator {
  render(state: PetState): void;
  show(snapshot: PetSnapshot): void;
}

export function createPetAnimator(canvas: HTMLCanvasElement): PetAnimator {
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  const sourceCanvas = document.createElement("canvas");
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true })!;
  let character: CharacterConfig;
  let animationId = 0;
  let renderedAction: CharacterAction | undefined;

  function isBlueScreen(red: number, green: number, blue: number): boolean {
    return blue > 120 && blue > red * 1.35 && blue > green * 1.35;
  }

  function findVisibleBounds(source: HTMLImageElement, frameCount: number): Bounds {
    sourceCanvas.width = source.naturalWidth;
    sourceCanvas.height = source.naturalHeight;
    sourceContext.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    sourceContext.drawImage(source, 0, 0);
    const pixels = sourceContext.getImageData(
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
    ).data;
    const frameWidth = source.naturalWidth / frameCount;
    let left = frameWidth;
    let top = source.naturalHeight;
    let right = 0;
    let bottom = 0;

    for (let y = 0; y < source.naturalHeight; y += 1) {
      for (let x = 0; x < source.naturalWidth; x += 1) {
        const offset = (y * source.naturalWidth + x) * 4;
        if (pixels[offset + 3] === 0) {
          continue;
        }
        if (isBlueScreen(pixels[offset], pixels[offset + 1], pixels[offset + 2])) {
          continue;
        }
        const frameX = x % frameWidth;
        left = Math.min(left, frameX);
        top = Math.min(top, y);
        right = Math.max(right, frameX + 1);
        bottom = Math.max(bottom, y + 1);
      }
    }

    if (right === 0 || bottom === 0) {
      return { x: 0, y: 0, width: frameWidth, height: source.naturalHeight };
    }
    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  function removeBlueScreen(): void {
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let offset = 0; offset < frame.data.length; offset += 4) {
      if (isBlueScreen(
        frame.data[offset],
        frame.data[offset + 1],
        frame.data[offset + 2],
      )) {
        frame.data[offset + 3] = 0;
      }
    }
    context.putImageData(frame, 0, 0);
  }

  function visualPlacement(bounds: Bounds, adjustment: VisualAdjustment = {}) {
    const adjustmentScale = adjustment.scale ?? 1;
    const offset = adjustment.offset ?? { x: 0, y: 0 };
    const scale = character.visual.contentHeight / bounds.height * adjustmentScale;
    return {
      scale,
      x: character.visual.footAnchor.x
        - (bounds.x + bounds.width / 2) * scale
        + offset.x,
      y: character.visual.footAnchor.y
        - (bounds.y + bounds.height) * scale
        + offset.y,
    };
  }

  function drawFrame(
    source: HTMLImageElement,
    action: CharacterAction,
    bounds: Bounds,
    frameIndex: number,
  ): void {
    const frameCount = action.kind === "sprite" ? action.frameCount : 1;
    const sourceWidth = source.naturalWidth / frameCount;
    const placement = visualPlacement(bounds, action.adjustment);
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
    removeBlueScreen();
  }

  function playAction(action: CharacterAction, ownAnimationId: number): void {
    const source = new Image();
    source.src = `${character.assetRoot}/${encodeURIComponent(action.asset)}`;
    source.addEventListener("load", () => {
      const frameCount = action.kind === "sprite" ? action.frameCount : 1;
      const bounds = findVisibleBounds(source, frameCount);
      const startedAt = performance.now();

      function draw(now: number): void {
        if (animationId !== ownAnimationId) {
          return;
        }
        let frameIndex = 0;
        if (action.kind === "sprite") {
          const elapsed = now - startedAt;
          frameIndex = Math.floor(elapsed / action.frameDurationMs)
            % action.frameCount;
        }
        drawFrame(source, action, bounds, frameIndex);
        requestAnimationFrame(draw);
      }

      requestAnimationFrame(draw);
    });
  }

  function render(state: PetState): void {
    const action = character.actions[state.action] ?? character.actions.idle;
    canvas.classList.toggle("facing-left", state.facing === "left");
    if (action === renderedAction) {
      return;
    }
    renderedAction = action;
    animationId += 1;
    playAction(action, animationId);
  }

  return {
    render,
    show(snapshot) {
      character = snapshot.character;
      canvas.width = character.size.width;
      canvas.height = character.size.height;
      renderedAction = undefined;
      render(snapshot.state);
    },
  };
}
