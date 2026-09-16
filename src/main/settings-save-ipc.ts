import { settingsChannels } from "../shared/channels.ts";
import type { SettingsCoordinator } from "./settings-coordinator.ts";

interface IpcRegistrar {
  handle(channel: string, listener: (...args: any[]) => unknown): void;
}

export function registerSettingsSaveIpc(
  ipc: IpcRegistrar,
  coordinator: SettingsCoordinator,
): void {
  ipc.handle(
    settingsChannels.save,
    (_event, value: unknown) => coordinator.save(value),
  );
}
