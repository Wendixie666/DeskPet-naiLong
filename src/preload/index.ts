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
  summon(x: number, y: number): void {
    ipcRenderer.send("pet:summon", x, y);
  },
});
