import type { PetSnapshot, PetState } from "../shared/types";

declare global {
  interface Window {
    desktopPet: {
      click(): void;
      dragBy(deltaX: number, deltaY: number): void;
      getSnapshot(): Promise<PetSnapshot>;
      onStateChange(listener: (state: PetState) => void): () => void;
      summon(x: number, y: number): void;
    };
  }
}

export {};
