import type { PetSnapshot, Point, SettingsSnapshot } from "../shared/types";
import { petChannels, settingsChannels } from "../shared/channels.ts";

export interface PetIpcHandlers {
  click(): void;
  contextMenu(): void;
  dragBy(deltaX: number, deltaY: number): void;
  endDrag(): void;
  endPat(): void;
  getSettings(): SettingsSnapshot;
  snapshot(): PetSnapshot;
  startDrag(pointer: Point): void;
  startPat(): void;
  updateSettings(value: unknown): SettingsSnapshot;
}

interface IpcRegistrar {
  handle(channel: string, listener: (...args: any[]) => unknown): void;
  on(channel: string, listener: (...args: any[]) => void): void;
}

export function registerPetIpc(ipc: IpcRegistrar, handlers: PetIpcHandlers): void {
  ipc.handle(petChannels.snapshot, () => handlers.snapshot());
  ipc.handle(settingsChannels.get, () => handlers.getSettings());
  ipc.handle(settingsChannels.update, (_event, value: unknown) => handlers.updateSettings(value));
  ipc.on(petChannels.click, () => handlers.click());
  ipc.on(petChannels.dragBy, (_event, deltaX: number, deltaY: number) => {
    handlers.dragBy(deltaX, deltaY);
  });
  ipc.on(petChannels.dragStart, (_event, x: number, y: number) => {
    handlers.startDrag({ x, y });
  });
  ipc.on(petChannels.dragEnd, () => handlers.endDrag());
  ipc.on(petChannels.patEnd, () => handlers.endPat());
  ipc.on(petChannels.patStart, () => handlers.startPat());
  ipc.on(petChannels.contextMenu, () => handlers.contextMenu());
}
