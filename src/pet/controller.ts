import type { PetAction, PetState, Point, Size } from "../shared/types";

interface PetControllerOptions {
  clickActions: PetAction[];
  initialPosition: Point;
  random?: () => number;
  size: Size;
  speed: number;
}

export interface PetController {
  click(): PetState;
  getState(): PetState;
  moveTo(x: number, y: number): PetState;
  summon(x: number, y: number): PetState;
  tick(deltaMs: number): PetState;
}

function copyState(state: PetState): PetState {
  return {
    ...state,
    position: { ...state.position },
  };
}

export function createPetController(options: PetControllerOptions): PetController {
  const random = options.random ?? Math.random;
  let target: Point | undefined;
  const state: PetState = {
    action: "idle",
    facing: "right",
    isMoving: false,
    position: { ...options.initialPosition },
  };

  return {
    click() {
      const index = Math.min(
        Math.floor(random() * options.clickActions.length),
        options.clickActions.length - 1,
      );
      state.action = options.clickActions[index];
      return copyState(state);
    },

    getState() {
      return copyState(state);
    },

    moveTo(x, y) {
      target = undefined;
      state.action = "idle";
      state.isMoving = false;
      state.position = { x, y };
      return copyState(state);
    },

    summon(x, y) {
      target = {
        x: x - options.size.width / 2,
        y: y - options.size.height,
      };
      state.action = "walk";
      state.isMoving = true;

      if (target.x !== state.position.x) {
        state.facing = target.x < state.position.x ? "left" : "right";
      }

      return copyState(state);
    },

    tick(deltaMs) {
      if (!target) {
        return copyState(state);
      }

      const dx = target.x - state.position.x;
      const dy = target.y - state.position.y;
      const distance = Math.hypot(dx, dy);
      const step = options.speed * deltaMs / 1_000;

      if (distance <= step) {
        state.position = target;
        state.action = "idle";
        state.isMoving = false;
        target = undefined;
        return copyState(state);
      }

      state.position = {
        x: state.position.x + dx / distance * step,
        y: state.position.y + dy / distance * step,
      };
      state.action = "walk";
      state.isMoving = true;
      return copyState(state);
    },
  };
}
