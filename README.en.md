# DeskPet-naiLong

[简体中文](./README.md) | English

A desktop pet built with Electron, TypeScript, and vanilla HTML/CSS. The current star is the Milk Frog: it sits on your desktop and responds to clicks, dragging, and a summon shortcut.

> The project is in early development. The current character is the Milk Frog; Bull, the Meituan kangaroo, and custom characters are planned for later.

## Quick Start

### Requirements

- Node.js 22 or newer
- npm
- Windows, macOS, or Linux X11/XWayland

If Node.js is not installed yet, download it from the [Node.js website](https://nodejs.org/en/download).

On Windows, you can also run this in PowerShell or Command Prompt:
```powershell
winget install --id OpenJS.NodeJS.LTS -e
```


### Install and Launch

```bash
npm install
npm start
```

Dependencies are installed only into this repository's `node_modules`; Electron does not need to be installed globally.

## Current Features

- The Milk Frog has different forms and actions; click it to switch actions;

<p align="center">
  <img src="image.png" width="500">
</p>

- Drag with the mouse to move the pet around;

- Summon the pet to the current mouse cursor position with a keyboard shortcut;

<p align="center">
  <img src="image-1.png" width="500">
</p>

- In the head-turning state, simple gaze tracking of the cursor is supported;

<p align="center">
  <img src="屏幕截图 2026-08-24 180151.png" width="500">
</p>

- Right-click the pet to open the settings window, where you can change the character, pet size, default position, and the summon shortcut.

<p align="center">
  <img src="image-2.png" width="500">
</p>

## Usage

After launching:

- Click the Milk Frog to randomly switch actions;
- Hold and drag the Milk Frog to change the pet's position;
- Press `CommandOrControl+Alt+P` by default to summon the pet to the mouse position;
- Right-click the Milk Frog to open the settings window.

The shortcut on each system:

| System | Default Shortcut |
| --- | --- |
| Windows | `Ctrl+Alt+P` |
| macOS | `Command+Option+P` |
| Linux | `Ctrl+Alt+P` |

## Platform Notes

Target platforms are Windows, macOS, and Linux X11/XWayland, but development and debugging have so far only been tried on Windows and Linux; macOS may still have bugs.

- Windows, macOS, and Linux X11/XWayland support the full window-move and summon flow;
- X11 or XWayland is recommended on Linux. Native Wayland does not guarantee programmatic window positioning, resizing, or frame-by-frame movement;
- On Debian/Ubuntu, if startup complains about missing system libraries, install:

  ```bash
  sudo apt install libgtk-3-0 libnss3 libasound2 libgbm1 libxss1 libxtst6 libnotify4 libatspi2.0-0
  ```

- The settings window's transparent theme and system materials are platform-specific visual enhancements and may not look identical on every system; the acrylic system material is currently enabled on Windows only;
- On macOS, the app keeps running after the pet window is closed and can be reactivated from the Dock; use `Command+Q` to quit the app.

## Development and Verification

Run tests, type checks, and builds:

```bash
npm test
npm run typecheck
npm run build
```

Python 3 and Pillow are only needed when you modify the original blue-screen images under `素材/奶蛙` and regenerate the transparent Sprite Sheets.

Asset directory conventions:

- `素材/奶蛙/*.png`: original blue-screen assets; used only as preprocessing input, never read directly by the renderer;
- `素材/奶蛙/processed/*.processed.png`: transparent Sprite Sheets read at runtime;
- `素材/奶蛙/processed/*.processed.debug.png`: preview images with frame boundaries and anchor guides; not read by the renderer;
- `素材/奶蛙/processed/all-states.gif`: finished GIF used directly by the current idle action.

After modifying original assets, regenerate the corresponding processed files and make sure the frame count matches `frameCount` in the character config:

```bash
python -m pip install Pillow
python tools/preprocess_sprite.py --help
python tools/preprocess_sprite_test.py
```

Some Linux/macOS environments need `python3` instead; on Windows you can use `py -m pip` and `py tools/preprocess_sprite.py`.

The preprocessing script only runs when assets change; the pet does not call it at startup and does not regenerate character assets from the original blue-screen images.

## Project Docs

- [Launch & Verification Commands](./启动指令.md)
- [Desktop Pet Technology Research](./docs/research/desktop-pet-technology.md)
- [Electron Cross-Platform Compatibility Review](./docs/research/cross-platform-electron.md)
- [README Structure Reference](./docs/research/readme-patterns.md)

## Tech Stack

- Electron 43
- TypeScript 5.8
- Vanilla HTML/CSS
- Canvas Sprite Sheet rendering

## Design Direction

Character differences are expressed via `CharacterRegistry` and `CharacterConfig`, keeping window control, pet movement, and rendering responsibilities separate. When adding new characters later, prefer wiring them in through character config rather than scattering character checks across window and rendering logic.
