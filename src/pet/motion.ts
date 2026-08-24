import type { CharacterConfig, Bounds, PetState, Point } from "../shared/types";
import { resolveLookDirection } from "./look-direction.ts";

interface PetMotionWindow {
  getBounds(): Bounds;
  getPosition(): number[];
  setPosition(x: number, y: number): void;
  workAreaAt(point: Point): Bounds;
}

interface PetMotionOptions {
  character: Pick<CharacterConfig, "clickActions" | "speed" | "trackingAction" | "visual">;
  initialPosition: Point;
  onStateChange(state: PetState): void;
  scale: number;
  window: PetMotionWindow;
  cursorPosition?: () => Point;
}

export interface PetMotion {
  click(): void;
  dragBy(deltaX: number, deltaY: number): void;
  getState(): PetState;
  summon(target: Point): void;
  tick(deltaMs: number): void;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function summonPosition(
  target: Point,
  bounds: Bounds,
  footAnchor: Point,
  workArea: Bounds,
): Point {
  const maximumX = Math.max(workArea.x, workArea.x + workArea.width - bounds.width);
  const maximumY = Math.max(workArea.y, workArea.y + workArea.height - bounds.height);

  return {
    x: clamp(Math.round(target.x - footAnchor.x), workArea.x, maximumX),
    y: clamp(Math.round(target.y - footAnchor.y), workArea.y, maximumY),
  };
}

export function createPetMotion(options: PetMotionOptions): PetMotion {
  let target: Point | undefined;
  let recentActions: string[] = [];
  const state: PetState = {
    actionSequence: 0,
    action: "idle",
    facing: "right",
    isMoving: false,
    position: { ...options.initialPosition },
  };

  function updateLookDirection(): boolean {
    if (!options.cursorPosition || state.action !== options.character.trackingAction) {
      return false;
    }
    const nextDirection = resolveLookDirection(
      options.cursorPosition(),
      options.window.getBounds(),
    );
    if (state.lookDirection === nextDirection) {
      return false;
    }
    state.lookDirection = nextDirection;
    return true;
  }

  function snapshot(): PetState {
    return {
      ...state,
      position: { ...state.position },
    };
  }

  function nextAction(): string {
    const action = options.character.clickActions.find(
      (candidate) => !recentActions.includes(candidate),
    ) ?? options.character.clickActions[0];
    recentActions = [...recentActions, action].slice(
      -Math.max(options.character.clickActions.length - 1, 0),
    );
    return action;
  }

  return {
    click() {
      state.action = nextAction();
      state.actionSequence += 1;
      state.lookDirection = undefined;
      options.onStateChange(snapshot());
    },

    dragBy(deltaX, deltaY) {
      const [x, y] = options.window.getPosition();
      target = undefined;
      state.action = "idle";
      state.lookDirection = undefined;
      state.isMoving = false;
      state.position = {
        x: x + Math.round(deltaX),
        y: y + Math.round(deltaY),
      };
      options.window.setPosition(state.position.x, state.position.y);
      options.onStateChange(snapshot());
    },

    getState() {
      return snapshot();
    },

    summon(targetPoint) {
      const bounds = options.window.getBounds();
      const footAnchor = {
        x: options.character.visual.footAnchor.x * options.scale,
        y: options.character.visual.footAnchor.y * options.scale,
      };
      target = summonPosition(
        targetPoint,
        bounds,
        footAnchor,
        options.window.workAreaAt(targetPoint),
      );
      state.action = "walk";
      state.isMoving = true;
      state.lookDirection = undefined;
      if (target.x !== state.position.x) {
        state.facing = target.x < state.position.x ? "left" : "right";
      }
      options.onStateChange(snapshot());
    },

    tick(deltaMs) {
      if (!target) {
        if (updateLookDirection()) {
          options.onStateChange(snapshot());
        }
        return;
      }

      const dx = target.x - state.position.x;
      const dy = target.y - state.position.y;
      const distance = Math.hypot(dx, dy);
      const step = options.character.speed * deltaMs / 1_000;

      if (distance <= step) {
        state.position = target;
        state.action = "idle";
        state.isMoving = false;
        state.lookDirection = undefined;
        target = undefined;
      } else {
        state.position = {
          x: state.position.x + dx / distance * step,
          y: state.position.y + dy / distance * step,
        };
        state.action = "walk";
        state.isMoving = true;
        state.lookDirection = undefined;
      }
      options.window.setPosition(
        Math.round(state.position.x),
        Math.round(state.position.y),
      );
      options.onStateChange(snapshot());
    },
  };
}
