import type {
  CharacterConfig,
  Bounds,
  PetSnapshot,
  PetState,
  Point,
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
  getScale(): number;
  getSnapshot(): PetSnapshot;
  summon(target: Point): void;
}

export function createPetRuntime(options: PetRuntimeOptions): PetRuntime {
  let character = options.character;
  let scale = options.scale;
  let motion: PetMotion;

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
      onStateChange: options.onStateChange,
      window: options.window,
    });
    options.onSnapshotChange(snapshot());
  }

  configure(options.initialPosition);

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
      character = nextCharacter;
      scale = nextScale;
      configure(position);
    },

    click() {
      motion.click();
    },

    dispose() {
      if (animationTimer !== undefined) {
        clearInterval(animationTimer);
      }
    },

    dragBy(deltaX, deltaY) {
      motion.dragBy(deltaX, deltaY);
    },

    getScale() {
      return scale;
    },

    getSnapshot: snapshot,

    summon(target) {
      motion.summon(target);
    },
  };
}
