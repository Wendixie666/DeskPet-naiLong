import type {
  Bounds,
  CharacterConfig,
  Facing,
  PetState,
  Point,
} from "../shared/types";
import { constrainPosition, scaledFootAnchor } from "./geometry.ts";
import { resolveLookDirection } from "./look-direction.ts";

export const KEYBOARD_INACTIVITY_TIMEOUT_MS = 1_500;

interface PetMotionWindow {
  getBounds(): Bounds;
  getPosition(): number[];
  setPosition(x: number, y: number): void;
  workAreaAt(point: Point): Bounds;
}

interface PetMotionOptions {
  character: Pick<
    CharacterConfig,
    "clickActions" | "interactionActions" | "speed" | "trackingAction" | "visual"
  >;
  initialPosition: Point;
  onStateChange(state: PetState): void;
  scale: number;
  window: PetMotionWindow;
  cursorPosition?: () => Point;
}

export interface PetMotion {
  click(): void;
  dragBy(deltaX: number, deltaY: number): void;
  endDrag(): void;
  endPat(): void;
  enterWindowPerch(position: Point): void;
  exitWindowPerch(): void;
  getState(): PetState;
  keyboardActivity(): void;
  summon(target: Point): void;
  startPat(): void;
  tick(deltaMs: number): void;
  triggerReminder(): boolean;
  endReminder(): void;
}

export function createPetMotion(options: PetMotionOptions): PetMotion {
  const edgeSnapDistance = 24;
  let target: Point | undefined;
  let climbingSide: Facing | undefined;
  let recentActions: string[] = [];
  let typingActivityRemainingMs = 0;
  let reminderPending = false;
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

  function setAction(action: string): void {
    if (state.action === action) {
      return;
    }
    state.action = action;
    state.actionSequence += 1;
    state.lookDirection = undefined;
  }

  function stopMovement(): void {
    target = undefined;
    climbingSide = undefined;
    state.isMoving = false;
  }

  function isWindowPerched(): boolean {
    return options.character.interactionActions?.windowPerch !== undefined
      && state.action === options.character.interactionActions.windowPerch;
  }

  function resumeAmbientAction(): void {
    setAction(typingActivityRemainingMs > 0 ? "typing" : "idle");
  }

  function startReminder(): boolean {
    const action = options.character.interactionActions?.reminder;
    if (!action || state.action === action) {
      return false;
    }
    stopMovement();
    typingActivityRemainingMs = 0;
    setAction(action);
    options.onStateChange(snapshot());
    return true;
  }

  function resumeAfterReminder(): void {
    if (reminderPending) {
      reminderPending = false;
      if (startReminder()) {
        return;
      }
    }
    resumeAmbientAction();
  }

  function edgeClimbPosition(): { side: Facing; x: number } | undefined {
    const bounds = options.window.getBounds();
    const display = options.window.workAreaAt({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    });
    const rightDistance = display.x + display.width - bounds.x - bounds.width;
    if (bounds.x - display.x <= edgeSnapDistance) {
      return { side: "left", x: display.x };
    }
    if (rightDistance <= edgeSnapDistance) {
      return {
        side: "right",
        x: display.x + display.width - bounds.width,
      };
    }
    return undefined;
  }

  function startClimbing(): boolean {
    const action = options.character.interactionActions?.climb;
    const edge = edgeClimbPosition();
    if (!action || !edge) {
      return false;
    }

    const bounds = options.window.getBounds();
    stopMovement();
    climbingSide = edge.side;
    state.position = { x: edge.x, y: bounds.y };
    state.facing = edge.side === "left" ? "right" : "left";
    state.isMoving = true;
    setAction(action);
    options.window.setPosition(state.position.x, state.position.y);
    options.onStateChange(snapshot());
    return true;
  }

  return {
    click() {
      if (isWindowPerched()) {
        return;
      }
      if (climbingSide) {
        stopMovement();
      }
      if (reminderPending) {
        reminderPending = false;
        if (startReminder()) {
          return;
        }
      }
      state.action = nextAction();
      state.actionSequence += 1;
      state.lookDirection = undefined;
      options.onStateChange(snapshot());
    },

    dragBy(deltaX, deltaY) {
      const [x, y] = options.window.getPosition();
      stopMovement();
      setAction(options.character.interactionActions?.drag ?? "idle");
      state.position = {
        x: x + Math.round(deltaX),
        y: y + Math.round(deltaY),
      };
      options.window.setPosition(state.position.x, state.position.y);
      options.onStateChange(snapshot());
    },

    endDrag() {
      if (state.action !== options.character.interactionActions?.drag) {
        return;
      }
      if (startClimbing()) {
        return;
      }
      resumeAfterReminder();
      options.onStateChange(snapshot());
    },

    endPat() {
      if (state.action !== options.character.interactionActions?.pat) {
        return;
      }
      resumeAfterReminder();
      options.onStateChange(snapshot());
    },

    enterWindowPerch(position) {
      const action = options.character.interactionActions?.windowPerch;
      if (!action) {
        return;
      }
      stopMovement();
      reminderPending = false;
      typingActivityRemainingMs = 0;
      state.position = { ...position };
      state.isMoving = false;
      setAction(action);
      options.window.setPosition(position.x, position.y);
      options.onStateChange(snapshot());
    },

    exitWindowPerch() {
      if (!isWindowPerched()) {
        return;
      }
      stopMovement();
      setAction("idle");
      options.onStateChange(snapshot());
    },

    getState() {
      return snapshot();
    },

    keyboardActivity() {
      if (isWindowPerched()) {
        return;
      }
      if (state.action === options.character.interactionActions?.reminder) {
        return;
      }
      typingActivityRemainingMs = KEYBOARD_INACTIVITY_TIMEOUT_MS;
      stopMovement();
      if (reminderPending) {
        reminderPending = false;
        if (startReminder()) {
          return;
        }
      }
      if (state.action === "typing") {
        return;
      }
      setAction("typing");
      options.onStateChange(snapshot());
    },

    summon(targetPoint) {
      if (isWindowPerched()) {
        stopMovement();
        setAction("idle");
        options.onStateChange(snapshot());
      }
      stopMovement();
      const bounds = options.window.getBounds();
      const footAnchor = scaledFootAnchor(options.character, options.scale);
      target = constrainPosition(
        { x: targetPoint.x - footAnchor.x, y: targetPoint.y - footAnchor.y },
        bounds,
        options.window.workAreaAt(targetPoint),
      );
      state.action = "walk";
      state.actionSequence += 1;
      state.isMoving = true;
      state.lookDirection = undefined;
      if (target.x !== state.position.x) {
        state.facing = target.x < state.position.x ? "left" : "right";
      }
      options.onStateChange(snapshot());
    },

    startPat() {
      if (isWindowPerched()) {
        return;
      }
      const action = options.character.interactionActions?.pat;
      if (!action) {
        return;
      }
      stopMovement();
      setAction(action);
      options.onStateChange(snapshot());
    },

    triggerReminder() {
      if (isWindowPerched()) {
        return false;
      }
      const action = options.character.interactionActions?.reminder;
      if (!action || state.action === action || reminderPending) {
        return false;
      }
      if (state.action === options.character.interactionActions?.drag
        || state.action === options.character.interactionActions?.pat
        || state.isMoving) {
        reminderPending = true;
        return true;
      }
      return startReminder();
    },

    endReminder() {
      if (isWindowPerched()) {
        return;
      }
      if (state.action !== options.character.interactionActions?.reminder) {
        return;
      }
      typingActivityRemainingMs = 0;
      stopMovement();
      setAction("idle");
      options.onStateChange(snapshot());
    },

    tick(deltaMs) {
      if (isWindowPerched()) {
        return;
      }
      typingActivityRemainingMs = Math.max(
        typingActivityRemainingMs - deltaMs,
        0,
      );
      if (climbingSide) {
        const bounds = options.window.getBounds();
        const display = options.window.workAreaAt({
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2,
        });
        const step = options.character.speed * deltaMs / 1_000;
        const nextY = Math.max(display.y, state.position.y - step);
        state.position = { x: state.position.x, y: nextY };
        if (nextY === display.y) {
          climbingSide = undefined;
          state.isMoving = false;
          if (reminderPending) {
            reminderPending = false;
            startReminder();
          } else {
            resumeAmbientAction();
          }
        } else {
          state.isMoving = true;
        }
        options.window.setPosition(
          Math.round(state.position.x),
          Math.round(state.position.y),
        );
        options.onStateChange(snapshot());
        return;
      }

      if (!target) {
        if (state.action === "typing" && typingActivityRemainingMs === 0) {
          setAction("idle");
          options.onStateChange(snapshot());
          return;
        }
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
        state.isMoving = false;
        state.lookDirection = undefined;
        target = undefined;
        if (reminderPending) {
          reminderPending = false;
          startReminder();
        } else {
          resumeAmbientAction();
        }
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
