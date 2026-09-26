import { createPetAnimator } from "./pet-animation.js";
import { isActivePointer, isInHeadInteraction } from "./pet-interaction.js";
import type { CharacterVisual, PetSnapshot } from "../shared/types";

const petElement = document.querySelector<HTMLElement>("#pet")!;
const canvas = document.querySelector<HTMLCanvasElement>("#pet-canvas")!;
const animator = createPetAnimator(canvas);

interface PointerGesture {
  isHead: boolean;
  lastX: number;
  lastY: number;
  moved: number;
  pointerId: number;
  startX: number;
  startY: number;
}

let gesture: PointerGesture | undefined;
let characterVisual: CharacterVisual | undefined;

function localPoint(event: PointerEvent) {
  const bounds = petElement.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) / bounds.width * canvas.width,
    y: (event.clientY - bounds.top) / bounds.height * canvas.height,
  };
}

function showSnapshot(snapshot: PetSnapshot): void {
  characterVisual = snapshot.character.visual;
  animator.show(snapshot);
}

function cancelGesture(pointerId?: number): void {
  if (!gesture) {
    return;
  }
  if (pointerId !== undefined && !isActivePointer(gesture, pointerId)) {
    return;
  }
  if (gesture.isHead) {
    window.desktopPet.endPat();
  }
  if (gesture.moved >= 4) {
    window.desktopPet.endDrag();
  }
  gesture = undefined;
}

petElement.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  window.desktopPet.openContextMenu();
});

petElement.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || gesture) {
    return;
  }
  petElement.setPointerCapture(event.pointerId);
  gesture = {
    isHead: characterVisual
      ? isInHeadInteraction(localPoint(event), characterVisual)
      : false,
    lastX: event.screenX,
    lastY: event.screenY,
    moved: 0,
    pointerId: event.pointerId,
    startX: event.screenX,
    startY: event.screenY,
  };
  if (gesture.isHead) {
    window.desktopPet.startPat();
  }
});

petElement.addEventListener("pointermove", (event) => {
  if (!gesture || !isActivePointer(gesture, event.pointerId)) {
    return;
  }

  const deltaX = event.screenX - gesture.lastX;
  const deltaY = event.screenY - gesture.lastY;
  gesture.moved += Math.hypot(deltaX, deltaY);
  gesture.lastX = event.screenX;
  gesture.lastY = event.screenY;

  if (gesture.moved >= 4) {
    if (gesture.isHead) {
      window.desktopPet.endPat();
      gesture.isHead = false;
    }
    if (gesture.moved - Math.hypot(deltaX, deltaY) < 4) {
      window.desktopPet.startDrag(gesture.startX, gesture.startY);
    }
    window.desktopPet.dragBy(deltaX, deltaY);
  }
});

petElement.addEventListener("pointerup", (event) => {
  if (!gesture || !isActivePointer(gesture, event.pointerId)) {
    return;
  }
  if (gesture.moved < 4) {
    if (gesture.isHead) {
      window.desktopPet.endPat();
    } else {
      window.desktopPet.click();
    }
  } else {
    window.desktopPet.endDrag();
  }
  gesture = undefined;
});

petElement.addEventListener("pointercancel", (event) => {
  cancelGesture(event.pointerId);
});

petElement.addEventListener("lostpointercapture", (event) => {
  cancelGesture(event.pointerId);
});

window.addEventListener("blur", () => {
  cancelGesture();
});

window.desktopPet.onSnapshotChange(showSnapshot);
window.desktopPet.onStateChange(animator.render);
window.desktopPet.getSnapshot().then(showSnapshot);
