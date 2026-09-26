# DeskPet-naiLong

[简体中文](./README.md) | English

A desktop pet built with Electron, TypeScript, and vanilla HTML/CSS. It currently includes four characters—Milk Frog, Lulu, Big Milk Frog, and Luo Xiaohei—as well as character chat, a memo, and deadline reminders.

> The project is in early development. Some platform capabilities and visual effects may still vary by system.

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

### Characters

Characters can be switched from the settings window. Each character has its own actions, assets, and chat persona:

| Character | Highlights |
| --- | --- |
| Milk Frog | Multiple click actions and gaze tracking |
| Lulu | Waving, running, and head patting |
| Big Milk Frog | Multiple animated actions and gaze tracking |
| Luo Xiaohei | Waving and the Heixiu action |

Character differences are wired through configuration, so more characters and actions can be added later.

### Pet Interaction

- Click the pet to randomly switch to one of the current character's click actions;
- Drag the pet with the mouse;
- When the user types in another application, the pet enters a typing state and returns to idle after about 1.5 seconds without keyboard activity;
- Summon the pet to the current mouse cursor position with a keyboard shortcut;
- Some characters support simple cursor gaze tracking while looking or turning their heads;
- Right-click the pet to open the toolbox, settings, or quit menu.

<p align="center">
  <img src="docs/assets/illustrations/character-overview.png" width="500">
</p>

### Toolbox

- **Character chat**: Chat with the selected character using its persona, with streaming replies and a new-chat action;
- **Memo**: Create, edit, complete, and delete todo items;
- **Deadline reminders**: Set a date or a specific time for a todo. When it is due, the pet shows a reminder card; characters without a reminder action fall back to a system notification;
- **AI configuration**: Supports DeepSeek and OpenAI Compatible services with configurable Base URL, Model, and API Key.

<p align="center">
  <img src="docs/assets/screenshots/toolbox.png" width="500">
</p>

### Settings

Right-click the pet and open “Settings” to change:

- The current character;
- Pet size;
- Light or dark interface theme;
- Whether the pet starts at the bottom-right corner or at its last position;
- The summon shortcut.

<p align="center">
  <img src="docs/assets/screenshots/settings.png" width="500">
</p>

## Usage

After launching:

- Click the pet to trigger an action for the current character;
- Hold and drag the pet to move it;
- Right-click the pet and open chat or the memo from the toolbox;
- Press `CommandOrControl+Alt+P` by default to summon the pet to the mouse position;
- Right-click the pet to open settings and change the character, size, theme, position, or shortcut.

The shortcut on each system:

| System | Default Shortcut |
| --- | --- |
| Windows | `Ctrl+Alt+P` |
| macOS | `Command+Option+P` |
| Linux | `Ctrl+Alt+P` |

### Configure Character Chat

1. Right-click the pet and choose “Toolbox > Chat”;
2. Click “Settings” in the top-right corner of the chat window;
3. Choose `DeepSeek` or `OpenAI Compatible`, then enter the Base URL, Model, and API Key;
4. Click “Test Connection” and save after the connection succeeds.

For DeepSeek, use `https://api.deepseek.com` as the Base URL. For another OpenAI-compatible service, use the URL provided by that service. The API Key is not exposed in settings snapshots; the app attempts to store it using the operating system's secure storage.

## Platform Notes

Target platforms are Windows, macOS, and Linux X11/XWayland, but development and debugging have so far been focused on Windows and Linux; macOS may still have compatibility issues.

- Windows, macOS, and Linux X11/XWayland support the full window-move and summon flow;
- Global keyboard activity monitoring uses `uiohook-napi`. On macOS, allow the app under “System Settings > Privacy & Security > Input Monitoring” on first use; if your system lists it under “Accessibility”, allow it there as well. The app only observes keyboard activity signals and does not record specific keys;
- Native Wayland does not guarantee global keyboard activity monitoring; use X11 or XWayland on Linux;
- Native Wayland also does not guarantee programmatic window positioning, resizing, or frame-by-frame movement;
- On Debian/Ubuntu, if startup complains about missing system libraries, install:

  ```bash
  sudo apt install libgtk-3-0 libnss3 libasound2 libgbm1 libxss1 libxtst6 libnotify4 libatspi2.0-0
  ```

- The settings window's transparent theme and system materials are platform-specific visual enhancements and may not look identical on every system; the acrylic system material is currently enabled on Windows only;
- If system secure storage is unavailable, the app will not save the AI API Key;
- On macOS, the app keeps running after the pet window is closed and can be reactivated from the Dock; use `Command+Q` to quit the app.

## Development and Verification

Run tests, type checks, builds, and the render check:

```bash
npm test
npm run typecheck
npm run build
npm run test:render
```

Package the app for the current platform:

```bash
npm run package
```

Use `npm run package:win`, `npm run package:mac`, or `npm run package:linux` to target a specific platform.

### Character Assets

Python 3 and Pillow are only needed when you modify original character images and regenerate transparent Sprite Sheets.

Asset directory conventions:

- `素材/<character>/*`: original images or character assets;
- `素材/奶蛙/processed/*`: transparent Sprite Sheets read at runtime by Milk Frog;
- `素材/大奶蛙/processed/*` and `素材/罗小黑/processed/*`: processed assets read at runtime by those characters;
- `*.processed.debug.png`: preview images with frame boundaries and anchor guides; not read by the renderer.

After modifying original assets, run the corresponding preprocessing script and make sure the generated frame count matches `frameCount` in the character config:

```bash
python -m pip install Pillow
python tools/preprocess_sprite.py --help
python tools/preprocess_sprite_test.py
```

Some Linux/macOS environments need `python3` instead; on Windows you can use `py -m pip` and `py tools/preprocess_sprite.py`. Big Milk Frog and Luo Xiaohei also have dedicated scripts at `tools/preprocess_danaiwa.py` and `tools/preprocess_xiaohei.py`.

The preprocessing scripts only run when assets change; the pet does not regenerate character assets at startup.

## Project Docs

- [Desktop Pet Technology Research](./docs/research/desktop-pet-technology.md)
- [Electron Cross-Platform Compatibility Review](./docs/research/cross-platform-electron.md)
- [README Structure Reference](./docs/research/readme-patterns.md)

## Tech Stack

- Electron 43
- TypeScript 5.8
- Vanilla HTML/CSS
- Canvas Sprite Sheet rendering
- OpenAI-compatible Chat Completions service interface

## Design Direction

Character differences are expressed via `CharacterRegistry` and `CharacterConfig`, while character personas are defined by Markdown files under `src/characters/personas/`. Window control, pet movement, rendering, and chat services remain separated. When adding a character, prefer wiring it through its character config, assets, and persona file rather than scattering character checks across window and rendering logic.
