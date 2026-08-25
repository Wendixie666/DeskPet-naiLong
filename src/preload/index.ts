import { contextBridge, ipcRenderer } from "electron";

import type { PetSnapshot, PetState } from "../shared/types";
import { petChannels } from "../shared/channels.ts";

export const desktopPetBridge = {
  click(): void {
    ipcRenderer.send(petChannels.click);
  },
  dragBy(deltaX: number, deltaY: number): void {
    ipcRenderer.send(petChannels.dragBy, deltaX, deltaY);
  },
  getSnapshot(): Promise<PetSnapshot> {
    return ipcRenderer.invoke(petChannels.snapshot);
  },
  onStateChange(listener: (state: PetState) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, state: PetState) => {
      listener(state);
    };
    ipcRenderer.on(petChannels.state, handler);
    return () => ipcRenderer.removeListener(petChannels.state, handler);
  },
  onSnapshotChange(listener: (snapshot: PetSnapshot) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: PetSnapshot) => {
      listener(snapshot);
    };
    ipcRenderer.on(petChannels.snapshotChanged, handler);
    return () => ipcRenderer.removeListener(petChannels.snapshotChanged, handler);
  },
  openContextMenu(): void {
    ipcRenderer.send(petChannels.contextMenu);
  },
};

contextBridge.exposeInMainWorld("desktopPet", desktopPetBridge);
