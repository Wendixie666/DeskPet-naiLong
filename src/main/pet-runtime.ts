import type {
  CharacterConfig,
  Bounds,
  PetSnapshot,
  PetState,
  Point,
  TodoItem,
} from "../shared/types";
import { createPetMotion, type PetMotion } from "../pet/motion.ts";
import { resizePetWindow } from "./pet-window.ts";

export interface PetRuntimeWindow {
  getBounds(): Bounds;
  getPosition(): number[];
  setBounds(bounds: Bounds): void;
  setPosition(x: number, y: number): void;
  workAreaAt(point: Point): Bounds;
}

interface PetRuntimeOptions {
  character: CharacterConfig;
  cursorPosition(): Point;
  initialPosition: Point;
  onSnapshotChange(snapshot: PetSnapshot): void;
  onReminderChange?(todo?: TodoItem): void;
  onStateChange(state: PetState): void;
  scale: number;
  tickMs?: number;
  window: PetRuntimeWindow;
}

export interface PetRuntime {
  applyCharacter(character: CharacterConfig, scale: number): void;
  click(): void;
  dispose(): void;
  dragBy(deltaX: number, deltaY: number): void;
  endDrag(): void;
  endPat(): void;
  getScale(): number;
  getSnapshot(): PetSnapshot;
  keyboardActivity(): void;
  summon(target: Point): void;
  startDrag(pointer: Point): void;
  startPat(): void;
  dismissReminder(): void;
  triggerReminder(todo: TodoItem): boolean;
}

export const REMINDER_DISPLAY_DURATION_MS = 7_000;

export function createPetRuntime(options: PetRuntimeOptions): PetRuntime {
  let character = options.character;
  let scale = options.scale;
  let motion: PetMotion;
  let pendingReminder: TodoItem | undefined;
  let activeReminder: TodoItem | undefined;
  let reminderTimer: ReturnType<typeof setTimeout> | undefined;

  function notifyMotionStateChange(state: PetState): void {
    const reminderAction = character.interactionActions?.reminder;
    if (state.action === reminderAction && pendingReminder) {
      activeReminder = pendingReminder;
      pendingReminder = undefined;
      options.onReminderChange?.(activeReminder);
      reminderTimer = setTimeout(() => {
        reminderTimer = undefined;
        activeReminder = undefined;
        options.onReminderChange?.();
        motion.endReminder();
      }, REMINDER_DISPLAY_DURATION_MS);
    }
    options.onStateChange(state);
  }

  function snapshot(): PetSnapshot {
    return {
      character,
      state: motion.getState(),
    };
  }

  function configure(position: Point): void {
    motion = createPetMotion({
      character,
      initialPosition: position,
      scale,
      cursorPosition: options.cursorPosition,
      onStateChange: notifyMotionStateChange,
      window: options.window,
    });
    options.onSnapshotChange(snapshot());
  }

  configure(options.initialPosition);

  function interruptReminder(): void {
    if (!activeReminder) {
      return;
    }
    if (reminderTimer !== undefined) {
      clearTimeout(reminderTimer);
      reminderTimer = undefined;
    }
    activeReminder = undefined;
    options.onReminderChange?.();
    motion.endReminder();
  }

  let previousTime = performance.now();
  const animationTimer = options.tickMs === undefined ? undefined : setInterval(() => {
    const currentTime = performance.now();
    motion.tick(currentTime - previousTime);
    previousTime = currentTime;
  }, options.tickMs);

  return {
    applyCharacter(nextCharacter, nextScale) {
      if (nextCharacter.id === character.id && nextScale === scale) {
        return;
      }

      const position = resizePetWindow(
        options.window,
        character,
        scale,
        nextCharacter,
        nextScale,
      );
      interruptReminder();
      pendingReminder = undefined;
      character = nextCharacter;
      scale = nextScale;
      configure(position);
    },

    click() {
      interruptReminder();
      motion.click();
    },

    dispose() {
      if (animationTimer !== undefined) {
        clearInterval(animationTimer);
      }
      interruptReminder();
      pendingReminder = undefined;
    },

    dragBy(deltaX, deltaY) {
      interruptReminder();
      motion.dragBy(deltaX, deltaY);
    },

    startDrag(pointer) {
      interruptReminder();
      motion.startDrag(pointer);
    },

    endDrag() {
      const dragAction = character.interactionActions?.drag;
      if (!dragAction || motion.getState().action !== dragAction) {
        return;
      }
      motion.endDrag();
    },

    endPat() {
      motion.endPat();
    },

    getScale() {
      return scale;
    },

    getSnapshot: snapshot,

    keyboardActivity() {
      motion.keyboardActivity();
    },

    summon(target) {
      interruptReminder();
      motion.summon(target);
    },

    startPat() {
      interruptReminder();
      motion.startPat();
    },

    dismissReminder() {
      interruptReminder();
    },

    triggerReminder(todo) {
      if (activeReminder || pendingReminder) {
        return false;
      }
      pendingReminder = todo;
      if (motion.triggerReminder()) {
        return true;
      }
      pendingReminder = undefined;
      return false;
    },
  };
}
