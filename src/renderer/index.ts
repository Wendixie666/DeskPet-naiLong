import { createPetAnimator } from "./pet-animation.js";

const petElement = document.querySelector<HTMLElement>("#pet")!;
const canvas = document.querySelector<HTMLCanvasElement>("#pet-canvas")!;
const animator = createPetAnimator(canvas);

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

window.desktopPet.onSnapshotChange(animator.show);
window.desktopPet.onStateChange(animator.render);
window.desktopPet.getSnapshot().then(animator.show);
