import type {
  CharacterConfig,
  Bounds,
  PetSnapshot,
  PetState,
  Point,
  SystemWindow,
  TodoItem,
} from "../shared/types";
import { scaledFootAnchor } from "../pet/geometry.ts";
import { createPetMotion, type PetMotion } from "../pet/motion.ts";
import {
  findWindowPerchTarget,
  sameWindowBounds,
  windowPerchPosition,
} from "../pet/window-perch.ts";
import { resizePetWindow } from "./pet-window.ts";
import type { WindowQuery } from "./window-query.ts";

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
  windowQuery?: WindowQuery;
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
  startPat(): void;
  dismissReminder(): void;
  triggerReminder(todo: TodoItem): boolean;
}

export const REMINDER_DISPLAY_DURATION_MS = 7_000;
export const WINDOW_PERCH_CHECK_INTERVAL_MS = 150;

export function createPetRuntime(options: PetRuntimeOptions): PetRuntime {
  let character = options.character;
  let scale = options.scale;
  let motion: PetMotion;
  let pendingReminder: TodoItem | undefined;
  let activeReminder: TodoItem | undefined;
  let reminderTimer: ReturnType<typeof setTimeout> | undefined;
  let windowPerchTarget: SystemWindow | undefined;
  let windowPerchTimer: ReturnType<typeof setInterval> | undefined;
  let dragReleaseRequest = 0;

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

  function stopWindowPerchMonitor(): void {
    if (windowPerchTimer !== undefined) {
      clearInterval(windowPerchTimer);
      windowPerchTimer = undefined;
    }
  }

  function exitWindowPerch(): void {
    if (!windowPerchTarget) {
      return;
    }
    windowPerchTarget = undefined;
    stopWindowPerchMonitor();
    motion.exitWindowPerch();
  }

  async function checkWindowPerch(): Promise<void> {
    const target = windowPerchTarget;
    if (!target || !options.windowQuery) {
      return;
    }
    try {
      const current = await options.windowQuery.getWindowBounds(target.id);
      if (!current
        || current.isMinimized
        || !current.isOrdinary
        || !sameWindowBounds(current.bounds, target.bounds)) {
        exitWindowPerch();
      }
    } catch {
      exitWindowPerch();
    }
  }

  function enterWindowPerch(target: SystemWindow): void {
    const perchAnchorY = character.visual.perchAnchorY;
    const perchAction = character.interactionActions?.windowPerch;
    if (!perchAction || perchAnchorY === undefined) {
      motion.endDrag();
      return;
    }
    const petBounds = options.window.getBounds();
    const position = windowPerchPosition(
      target.bounds,
      { width: petBounds.width, height: petBounds.height },
      scale,
      perchAnchorY,
    );
    windowPerchTarget = {
      ...target,
      bounds: { ...target.bounds },
    };
    motion.enterWindowPerch(position);
    stopWindowPerchMonitor();
    if (options.windowQuery) {
      windowPerchTimer = setInterval(() => {
        void checkWindowPerch();
      }, WINDOW_PERCH_CHECK_INTERVAL_MS);
    }
  }

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

      dragReleaseRequest += 1;
      exitWindowPerch();
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
      dragReleaseRequest += 1;
      exitWindowPerch();
      stopWindowPerchMonitor();
      if (animationTimer !== undefined) {
        clearInterval(animationTimer);
      }
      interruptReminder();
      pendingReminder = undefined;
    },

    dragBy(deltaX, deltaY) {
      dragReleaseRequest += 1;
      exitWindowPerch();
      interruptReminder();
      motion.dragBy(deltaX, deltaY);
    },

    endDrag() {
      const dragAction = character.interactionActions?.drag;
      if (!dragAction || motion.getState().action !== dragAction) {
        return;
      }
      const request = ++dragReleaseRequest;
      const query = options.windowQuery;
      const perchAnchorY = character.visual.perchAnchorY;
      if (!query || !character.interactionActions?.windowPerch || perchAnchorY === undefined) {
        motion.endDrag();
        return;
      }
      const petBounds = options.window.getBounds();
      void query.listWindows().then((windows) => {
        if (request !== dragReleaseRequest
          || motion.getState().action !== dragAction) {
          return;
        }
        const target = findWindowPerchTarget(
          petBounds,
          scaledFootAnchor(character, scale),
          windows,
        );
        if (target) {
          enterWindowPerch(target);
          return;
        }
        motion.endDrag();
      }).catch(() => {
        if (request === dragReleaseRequest
          && motion.getState().action === dragAction) {
          motion.endDrag();
        }
      });
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
      dragReleaseRequest += 1;
      exitWindowPerch();
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
