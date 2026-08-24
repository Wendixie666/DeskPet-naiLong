import { contextBridge, ipcRenderer } from "electron";

import type { PetSnapshot, PetState } from "../shared/types";

contextBridge.exposeInMainWorld("desktopPet", {
  click(): void {
    ipcRenderer.send("pet:click");
  },
  dragBy(deltaX: number, deltaY: number): void {
    ipcRenderer.send("pet:drag-by", deltaX, deltaY);
  },
  getSnapshot(): Promise<PetSnapshot> {
    return ipcRenderer.invoke("pet:snapshot");
  },
  onStateChange(listener: (state: PetState) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, state: PetState) => {
      listener(state);
    };
    ipcRenderer.on("pet:state", handler);
    return () => ipcRenderer.removeListener("pet:state", handler);
  },
  onSnapshotChange(listener: (snapshot: PetSnapshot) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: PetSnapshot) => {
      listener(snapshot);
    };
    ipcRenderer.on("pet:snapshot-changed", handler);
    return () => ipcRenderer.removeListener("pet:snapshot-changed", handler);
  },
  openContextMenu(): void {
    ipcRenderer.send("pet:context-menu");
  },
  summon(x: number, y: number): void {
    ipcRenderer.send("pet:summon", x, y);
  },
});
