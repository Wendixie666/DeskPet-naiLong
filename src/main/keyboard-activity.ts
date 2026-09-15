export interface KeyboardActivityHook {
  onKeydown(listener: () => void): void;
  start(): void;
  stop(): void;
}

export interface KeyboardActivityService {
  start(): void;
  stop(): void;
}

export function createKeyboardActivityService(
  hook: KeyboardActivityHook,
  onActivity: () => void,
  onDiagnostic: (message: string) => void = () => {},
): KeyboardActivityService {
  let started = false;

  return {
    start() {
      if (started) {
        return;
      }
      try {
        hook.onKeydown(onActivity);
        hook.start();
        started = true;
      } catch {
        try {
          hook.stop();
        } catch {
          // hook 初始化失败时不影响桌宠启动。
        }
        onDiagnostic("全局键盘监听启动失败，桌宠其他功能继续运行");
      }
    },

    stop() {
      if (!started) {
        return;
      }
      started = false;
      hook.stop();
    },
  };
}

export function createUiohookKeyboardActivityHook(): KeyboardActivityHook {
  const { uIOhook } = require("uiohook-napi") as {
    uIOhook: {
      on(event: "keydown", listener: (event: unknown) => void): void;
      start(): void;
      stop(): void;
    };
  };

  return {
    onKeydown(listener) {
      uIOhook.on("keydown", () => listener());
    },
    start() {
      uIOhook.start();
    },
    stop() {
      uIOhook.stop();
    },
  };
}
