import assert from "node:assert/strict";
import test from "node:test";

import { findWindowPerchTarget } from "../pet/window-perch.ts";
import {
  createSystemWindowQuery,
  nativeWindowId,
  normalizeX11WindowId,
} from "./window-query.ts";

const WMCTRL_OUTPUT = [
  "0x03c00007  0  100 200 800 600 code.Code Own Window",
  "0x04c00017  0  120 220 800 600 app.App Visible App",
  "0x05c00001  0  140 240 800 600 app.App Taskbar Window",
  "0x06c00001  0  1000 400 510 312 github desktop.GitHub Desktop GitHub Desktop",
].join("\n");

function createCommandRunner(
  onCommand: (command: string, args: string[]) => string,
): (command: string, args: string[]) => Promise<string> {
  return async (command, args) => onCommand(command, args);
}

test("X11 window ID normalization ignores hexadecimal leading zeroes", () => {
  assert.equal(normalizeX11WindowId("0x03c00007"), "0x3c00007");
  assert.equal(normalizeX11WindowId("0x3c00007"), "0x3c00007");
  assert.equal(
    nativeWindowId({
      getNativeWindowHandle: () => ({ readUInt32LE: () => 0x03c00007 }),
    }),
    "0x3c00007",
  );
});

test("Linux window query excludes the pet window from perch candidates", async () => {
  const query = createSystemWindowQuery({
    ownWindowId: "0x3c00007",
    commandRunner: createCommandRunner((command) => {
      assert.equal(command, "wmctrl");
      return WMCTRL_OUTPUT;
    }),
  });
  const windows = await query.listWindows();
  const target = findWindowPerchTarget({ x: 200, y: 200 }, windows);

  assert.equal(windows[0].id, "0x3c00007");
  assert.equal(windows[0].isOrdinary, false);
  assert.equal(target?.id, "0x4c00017");
  assert.equal(windows[2].isOrdinary, false);
  assert.equal(windows[3].isOrdinary, true);
});

test("Linux window query matches IDs in either X11 format and uses parsed bounds", async () => {
  const commands: string[] = [];

  const query = createSystemWindowQuery({
    ownWindowId: "0x3c00007",
    commandRunner: createCommandRunner((command, args) => {
      commands.push(`${command} ${args.join(" ")}`);
      return command === "wmctrl" ? WMCTRL_OUTPUT : "_NET_WM_WINDOW_TYPE_NORMAL";
    }),
  });
  const window = await query.getWindowBounds("0x04c00017");

  assert.deepEqual(window, {
    id: "0x4c00017",
    bounds: { x: 120, y: 220, width: 800, height: 600 },
    isMinimized: false,
    isOrdinary: true,
  });
  assert.equal(commands[1], "xprop -id 0x4c00017 _NET_WM_STATE _NET_WM_WINDOW_TYPE");
});
