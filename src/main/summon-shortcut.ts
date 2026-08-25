export interface ShortcutRegistrar {
  register(shortcut: string, callback: () => void): boolean;
  unregister(shortcut: string): void;
}

export interface ShortcutManager {
  apply(shortcut: string): boolean;
}

export function createShortcutManager(
  registrar: ShortcutRegistrar,
  summon: () => void,
): ShortcutManager {
  let current: string | undefined;

  function tryRegister(shortcut: string): boolean {
    try {
      return registrar.register(shortcut, summon);
    } catch {
      return false;
    }
  }

  return {
    apply(shortcut) {
      if (current === shortcut) {
        return true;
      }

      const previous = current;
      if (previous) {
        registrar.unregister(previous);
      }

      if (tryRegister(shortcut)) {
        current = shortcut;
        return true;
      }

      current = undefined;
      if (previous && tryRegister(previous)) {
        current = previous;
      }
      return false;
    },
  };
}
