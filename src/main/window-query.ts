import { execFile } from "node:child_process";

import type { SystemWindow } from "../shared/types";

export interface WindowQuery {
  getWindowBounds(id: string): Promise<SystemWindow | undefined>;
  listWindows(): Promise<SystemWindow[]>;
}

interface WindowQueryOptions {
  ownApplicationName?: string;
  ownProcessId?: number;
  ownWindowId?: string;
}

function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { maxBuffer: 2 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

function parseJsonWindows(output: string): SystemWindow[] {
  if (!output.trim()) {
    return [];
  }
  const parsed: unknown = JSON.parse(output);
  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items.map((item) => {
    const value = item as {
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      isMinimized?: boolean;
      isOrdinary?: boolean;
    };
    return {
      id: String(value.id),
      bounds: {
        x: Number(value.x),
        y: Number(value.y),
        width: Number(value.width),
        height: Number(value.height),
      },
      isMinimized: value.isMinimized ?? false,
      isOrdinary: value.isOrdinary ?? true,
    };
  });
}

function windowsPowerShellScript(ownProcessId: number): string {
  return `
$source = @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class WindowPerchNative {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder className, int maxCount);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@
Add-Type $source
$items = New-Object System.Collections.Generic.List[object]
[WindowPerchNative]::EnumWindows(
  [WindowPerchNative+EnumWindowsProc] {
    param($hWnd, $lParam)
    if (![WindowPerchNative]::IsWindowVisible($hWnd) -or [WindowPerchNative]::IsIconic($hWnd)) { return $true }
    $className = New-Object System.Text.StringBuilder 256
    [WindowPerchNative]::GetClassName($hWnd, $className, $className.Capacity) | Out-Null
    if ($className.ToString() -match 'Shell_TrayWnd|Progman|WorkerW|Windows.UI.Core.CoreWindow') { return $true }
    $rect = New-Object WindowPerchNative+RECT
    if (![WindowPerchNative]::GetWindowRect($hWnd, [ref]$rect)) { return $true }
    $windowProcessId = 0
    [WindowPerchNative]::GetWindowThreadProcessId($hWnd, [ref]$windowProcessId) | Out-Null
    if ($windowProcessId -eq ${ownProcessId}) { return $true }
    $items.Add([pscustomobject]@{
      id = $hWnd.ToInt64().ToString()
      x = $rect.Left
      y = $rect.Top
      width = $rect.Right - $rect.Left
      height = $rect.Bottom - $rect.Top
      isMinimized = $false
      isOrdinary = $true
    })
    return $true
  },
  [IntPtr]::Zero
) | Out-Null
$items | ConvertTo-Json -Compress
`;
}

async function listWindowsOnWindows(ownProcessId: number): Promise<SystemWindow[]> {
  const output = await runCommand("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    windowsPowerShellScript(ownProcessId),
  ]);
  return parseJsonWindows(output);
}

const MAC_WINDOW_SCRIPT = `
on run argv
  set ownName to item 1 of argv
  set oldDelimiters to AppleScript's text item delimiters
  set AppleScript's text item delimiters to linefeed
  set outputLines to {}
  tell application "System Events"
    repeat with processRef in application processes
      try
        if visible of processRef is true and name of processRef is not ownName then
          set processName to name of processRef
          set windowCount to count of windows of processRef
          repeat with windowIndex from 1 to windowCount
            set windowRef to window windowIndex of processRef
            set minimized to value of attribute "AXMinimized" of windowRef
            if minimized is not true then
              set windowPosition to position of windowRef
              set windowSize to size of windowRef
              set end of outputLines to processName & ":" & windowIndex & tab & (item 1 of windowPosition) & tab & (item 2 of windowPosition) & tab & (item 1 of windowSize) & tab & (item 2 of windowSize)
            end if
          end repeat
        end if
      end try
    end repeat
  end tell
  set AppleScript's text item delimiters to oldDelimiters
  return outputLines as text
end run
`;

async function listWindowsOnMac(applicationName: string): Promise<SystemWindow[]> {
  const output = await runCommand("osascript", [
    "-e",
    MAC_WINDOW_SCRIPT,
    "--",
    applicationName,
  ]);
  return output.trim().split("\n").filter(Boolean).map((line) => {
    const [id, x, y, width, height] = line.split("\t");
    return {
      id,
      bounds: {
        x: Number(x),
        y: Number(y),
        width: Number(width),
        height: Number(height),
      },
      isMinimized: false,
      isOrdinary: true,
    };
  });
}

function isOrdinaryLinuxWindow(windowClass: string, title: string): boolean {
  return !`${windowClass} ${title}`.match(
    /desktop|panel|dock|taskbar|plasmashell|gnome-shell|xfdesktop|polybar|waybar|tint2/i,
  );
}

async function listWindowsOnLinux(ownWindowId?: string): Promise<SystemWindow[]> {
  const output = await runCommand("wmctrl", ["-lGx"]);
  return output.trim().split("\n").filter(Boolean).map((line) => {
    const parts = line.trim().split(/\s+/);
    const [id, _desktop, x, y, width, height, windowClass] = parts;
    const title = parts.slice(8).join(" ");
    return {
      id,
      bounds: {
        x: Number(x),
        y: Number(y),
        width: Number(width),
        height: Number(height),
      },
      isMinimized: false,
      isOrdinary: id !== ownWindowId && isOrdinaryLinuxWindow(windowClass, title),
    };
  });
}

async function getLinuxWindow(
  id: string,
  ownWindowId?: string,
): Promise<SystemWindow | undefined> {
  const windows = await listWindowsOnLinux(ownWindowId);
  const target = windows.find((window) => window.id === id);
  if (!target || !target.isOrdinary) {
    return undefined;
  }
  try {
    const state = await runCommand("xprop", ["-id", id, "_NET_WM_STATE", "_NET_WM_WINDOW_TYPE"]);
    if (state.includes("_NET_WM_STATE_HIDDEN")
      || !state.includes("_NET_WM_WINDOW_TYPE_NORMAL")) {
      return undefined;
    }
  } catch {
    // 没有 xprop 时仍使用 wmctrl 的可见窗口结果。
  }
  return target;
}

export function nativeWindowId(window: {
  getNativeWindowHandle(): { readUInt32LE(offset: number): number };
}): string | undefined {
  if (process.platform !== "linux") {
    return undefined;
  }
  try {
    return `0x${window.getNativeWindowHandle().readUInt32LE(0).toString(16)}`;
  } catch {
    return undefined;
  }
}

export function createSystemWindowQuery(options: WindowQueryOptions): WindowQuery {
  async function listWindows(): Promise<SystemWindow[]> {
    try {
      if (process.platform === "win32" && options.ownProcessId !== undefined) {
        return await listWindowsOnWindows(options.ownProcessId);
      }
      if (process.platform === "darwin" && options.ownApplicationName) {
        return await listWindowsOnMac(options.ownApplicationName);
      }
      if (process.platform === "linux") {
        return await listWindowsOnLinux(options.ownWindowId);
      }
    } catch {
      return [];
    }
    return [];
  }

  return {
    listWindows,
    async getWindowBounds(id) {
      try {
        if (process.platform === "linux") {
          return await getLinuxWindow(id, options.ownWindowId);
        }
        return (await listWindows()).find((window) => window.id === id);
      } catch {
        return undefined;
      }
    },
  };
}
