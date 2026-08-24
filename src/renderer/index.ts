import type {
  CharacterAction,
  CharacterConfig,
  PetState,
  SpriteAction,
} from "../shared/types";

const petElement = document.querySelector<HTMLElement>("#pet")!;
const imageElement = document.querySelector<HTMLImageElement>("#pet-image")!;
const canvas = document.querySelector<HTMLCanvasElement>("#pet-canvas")!;
const context = canvas.getContext("2d", { willReadFrequently: true })!;

let character: CharacterConfig;
let animationId = 0;

function assetUrl(action: CharacterAction): string {
  return `${character.assetRoot}/${encodeURIComponent(action.asset)}`;
}

function setFacing(state: PetState): void {
  const isLeft = state.facing === "left";
  imageElement.classList.toggle("facing-left", isLeft);
  canvas.classList.toggle("facing-left", isLeft);
}

function removeBlueScreen(): void {
  const frame = context.getImageData(0, 0, canvas.width, canvas.height);

  for (let offset = 0; offset < frame.data.length; offset += 4) {
    const red = frame.data[offset];
    const green = frame.data[offset + 1];
    const blue = frame.data[offset + 2];

    if (blue > 120 && blue > red * 1.35 && blue > green * 1.35) {
      frame.data[offset + 3] = 0;
    }
  }

  context.putImageData(frame, 0, 0);
}

function drawSprite(
  source: HTMLImageElement,
  action: SpriteAction,
  frameIndex: number,
): void {
  const sourceWidth = source.naturalWidth / action.frameCount;
  const scale = Math.min(
    canvas.width / sourceWidth,
    canvas.height / source.naturalHeight,
  );
  const width = sourceWidth * scale;
  const height = source.naturalHeight * scale;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    source,
    sourceWidth * frameIndex,
    0,
    sourceWidth,
    source.naturalHeight,
    (canvas.width - width) / 2,
    canvas.height - height,
    width,
    height,
  );
  removeBlueScreen();
}

function playSprite(action: SpriteAction, ownAnimationId: number): void {
  const source = new Image();
  source.src = assetUrl(action);
  source.addEventListener("load", () => {
    const startedAt = performance.now();

    function draw(now: number): void {
      if (animationId !== ownAnimationId) {
        return;
      }

      const elapsed = now - startedAt;
      const frameIndex = Math.floor(elapsed / action.frameDurationMs)
        % action.frameCount;
      drawSprite(source, action, frameIndex);
      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  });
}

function render(state: PetState): void {
  const action = character.actions[state.action] ?? character.actions.idle;
  setFacing(state);
  animationId += 1;

  if (action.kind === "image") {
    canvas.style.display = "none";
    imageElement.style.display = "block";
    imageElement.src = assetUrl(action);
    return;
  }

  imageElement.style.display = "none";
  canvas.style.display = "block";
  playSprite(action, animationId);
}

interface PointerGesture {
  lastX: number;
  lastY: number;
  moved: number;
}

let gesture: PointerGesture | undefined;

petElement.addEventListener("pointerdown", (event) => {
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

window.desktopPet.onStateChange(render);
window.desktopPet.getSnapshot().then((snapshot) => {
  character = snapshot.character;
  canvas.width = character.size.width;
  canvas.height = character.size.height;
  render(snapshot.state);
});
