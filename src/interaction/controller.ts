import type { PetController } from "../pet/controller";
import type { PetState } from "../shared/types";

interface PetWindow {
  getPosition(): number[];
  setPosition(x: number, y: number): void;
}

interface InteractionOptions {
  onStateChange(state: PetState): void;
  pet: PetController;
  window: PetWindow;
}

export interface InteractionController {
  click(): void;
  dragBy(deltaX: number, deltaY: number): void;
  summon(x: number, y: number): void;
  tick(deltaMs: number): void;
}

export function createInteractionController(
  options: InteractionOptions,
): InteractionController {
  return {
    click() {
      options.onStateChange(options.pet.click());
    },

    dragBy(deltaX, deltaY) {
      const [x, y] = options.window.getPosition();
      const state = options.pet.moveTo(
        x + Math.round(deltaX),
        y + Math.round(deltaY),
      );
      options.window.setPosition(state.position.x, state.position.y);
      options.onStateChange(state);
    },

    summon(x, y) {
      options.onStateChange(options.pet.summon(x, y));
    },

    tick(deltaMs) {
      const previous = options.pet.getState();
      if (!previous.isMoving) {
        return;
      }

      const state = options.pet.tick(deltaMs);
      options.window.setPosition(
        Math.round(state.position.x),
        Math.round(state.position.y),
      );
      options.onStateChange(state);
    },
  };
}
