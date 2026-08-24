import type {
  Bounds,
  CharacterAction,
  CharacterConfig,
  PetState,
} from "../shared/types";
import { calculateVisualPlacement } from "./visual-layout.js";

const petElement = document.querySelector<HTMLElement>("#pet")!;
const canvas = document.querySelector<HTMLCanvasElement>("#pet-canvas")!;
const context = canvas.getContext("2d", { willReadFrequently: true })!;
const sourceCanvas = document.createElement("canvas");
const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true })!;

let character: CharacterConfig;
let animationId = 0;
let renderedAction: CharacterAction | undefined;

function assetUrl(action: CharacterAction): string {
  return `${character.assetRoot}/${encodeURIComponent(action.asset)}`;
}

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
      const alpha = pixels[offset + 3];
      if (alpha === 0) {
        continue;
      }

      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      if (isBlueScreen(red, green, blue)) {
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

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function removeBlueScreen(): void {
  const frame = context.getImageData(0, 0, canvas.width, canvas.height);

  for (let offset = 0; offset < frame.data.length; offset += 4) {
    const red = frame.data[offset];
    const green = frame.data[offset + 1];
    const blue = frame.data[offset + 2];

    if (isBlueScreen(red, green, blue)) {
      frame.data[offset + 3] = 0;
    }
  }

  context.putImageData(frame, 0, 0);
}

function drawFrame(
  source: HTMLImageElement,
  action: CharacterAction,
  bounds: Bounds,
  frameIndex: number,
): void {
  const frameCount = action.kind === "sprite" ? action.frameCount : 1;
  const sourceWidth = source.naturalWidth / frameCount;
  const placement = calculateVisualPlacement(
    bounds,
    character.visual,
    action.adjustment,
  );

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
  source.src = assetUrl(action);
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

interface PointerGesture {
  lastX: number;
  lastY: number;
  moved: number;
}

let gesture: PointerGesture | undefined;

petElement.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  window.desktopPet.openContextMenu();
});

petElement.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) {
    return;
  }
  petElement.setPointerCapture(event.pointerId);
  gesture = {
    lastX: event.screenX,
    lastY: event.screenY,
    moved: 0,
  };
});

petElement.addEventListener("pointermove", (event) => {
  if (!gesture) {
    return;
  }

  const deltaX = event.screenX - gesture.lastX;
  const deltaY = event.screenY - gesture.lastY;
  gesture.moved += Math.hypot(deltaX, deltaY);
  gesture.lastX = event.screenX;
  gesture.lastY = event.screenY;

  if (gesture.moved >= 4) {
    window.desktopPet.dragBy(deltaX, deltaY);
  }
});

petElement.addEventListener("pointerup", () => {
  if (gesture && gesture.moved < 4) {
    window.desktopPet.click();
  }
  gesture = undefined;
});

petElement.addEventListener("pointercancel", () => {
  gesture = undefined;
});

window.desktopPet.onSnapshotChange((snapshot) => {
  character = snapshot.character;
  canvas.width = character.size.width;
  canvas.height = character.size.height;
  renderedAction = undefined;
  render(snapshot.state);
});
window.desktopPet.onStateChange(render);
window.desktopPet.getSnapshot().then((snapshot) => {
  character = snapshot.character;
  canvas.width = character.size.width;
  canvas.height = character.size.height;
  render(snapshot.state);
});
