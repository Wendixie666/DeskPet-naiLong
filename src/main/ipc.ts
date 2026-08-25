import type { PetSnapshot, SettingsSnapshot } from "../shared/types";

export interface PetIpcHandlers {
  click(): void;
  contextMenu(): void;
  dragBy(deltaX: number, deltaY: number): void;
  getSettings(): SettingsSnapshot;
  snapshot(): PetSnapshot;
  summon(x: number, y: number): void;
  updateSettings(value: unknown): SettingsSnapshot;
}

interface IpcRegistrar {
  handle(channel: string, listener: (...args: any[]) => unknown): void;
  on(channel: string, listener: (...args: any[]) => void): void;
}

export function registerPetIpc(ipc: IpcRegistrar, handlers: PetIpcHandlers): void {
  ipc.handle("pet:snapshot", () => handlers.snapshot());
  ipc.handle("settings:get", () => handlers.getSettings());
  ipc.handle("settings:update", (_event, value: unknown) => handlers.updateSettings(value));
  ipc.on("pet:click", () => handlers.click());
  ipc.on("pet:drag-by", (_event, deltaX: number, deltaY: number) => {
    handlers.dragBy(deltaX, deltaY);
  });
  ipc.on("pet:summon", (_event, targetX: number, targetY: number) => {
    handlers.summon(targetX, targetY);
  });
  ipc.on("pet:context-menu", () => handlers.contextMenu());
}
