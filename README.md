# DeskPet-naiLong

简体中文 | [English](./README.en.md)

一个用 Electron、TypeScript 和原生 HTML/CSS 编写的桌面宠物奶蛙程序。

> 项目目前处于早期开发阶段。后续考虑增加一些更复杂或者抽象的功能。

## 快速开始

### 环境要求

- Node.js 22 或更新版本111
- npm
- Windows、macOS 或 Linux X11/XWayland

如果尚未安装 Node.js，可以从 [Node.js 官网](https://nodejs.org/en/download) 下载

Windows 则可以在 PowerShell 或命令提示符中执行：
```powershell
winget install --id OpenJS.NodeJS.LTS -e
```


### 安装并启动

```bash
npm install
npm start
```

依赖只会安装在本仓库的 `node_modules` 中，不需要全局安装 Electron。

## 当前功能

- 奶蛙有不同的形态和动作，点击即可切换奶蛙动作；

<p align="center">
  <img src="image.png" width="500">
</p>

- 支持鼠标拖拽移动桌宠；

- 当用户在其他应用中敲键盘时，奶蛙会陪着打字；停止键盘活动约 1.5 秒后恢复 idle；

- 支持使用快捷键将桌宠召唤到当前鼠标光标所在的屏幕位置；

<p align="center">
  <img src="image-1.png" width="500">
</p>

- 在转头状态下，支持简单的目光跟随光标功能；

<p align="center">
  <img src="屏幕截图 2026-08-24 180151.png" width="500">
</p>

- 右键点击桌宠可打开设置窗口，可修改角色、桌宠大小、默认位置和召唤快捷键。

<p align="center">
  <img src="image-2.png" width="500">
</p>

## 使用方式

启动后：

- 点击奶蛙，随机切换动作；
- 按住奶蛙拖动，改变桌宠位置；
- 默认按 `CommandOrControl+Alt+P`，将桌宠召唤到鼠标位置；
- 右键奶蛙，打开设置窗口。

快捷键在不同系统上的对应关系：

| 系统 | 默认快捷键 |
| --- | --- |
| Windows | `Ctrl+Alt+P` |
| macOS | `Command+Option+P` |
| Linux | `Ctrl+Alt+P` |

## 平台说明

目标平台是 Windows、macOS 和 Linux X11/XWayland，但是目前开发和调试都只是在win和linux上尝试过，mac可能会有bug。

- Windows、macOS 和 Linux X11/XWayland 支持完整的窗口移动和召唤流程；
- 全局键盘活动监听使用 `uiohook-napi`。macOS 首次使用时请在“系统设置 > 隐私与安全性 > 输入监控”（如系统列在“辅助功能”，也请允许）中允许本应用；应用只使用按键活动信号，不记录具体按键；
- Linux 原生 Wayland 不保证全局键盘活动监听，请使用 X11 或 XWayland；
- Linux 推荐使用 X11 或 XWayland。原生 Wayland 不保证程序化窗口定位、调整大小和逐帧移动；
- Debian/Ubuntu 如果启动时提示缺少系统库，可以安装：

  ```bash
  sudo apt install libgtk-3-0 libnss3 libasound2 libgbm1 libxss1 libxtst6 libnotify4 libatspi2.0-0
  ```

- 设置窗口的透明主题和系统材质属于平台相关的视觉增强，不保证所有系统显示一致；acrylic 系统材质目前只在 Windows 启用；
- macOS 关闭桌宠窗口后应用仍会保持运行，可以通过 Dock 重新激活；使用 `Command+Q` 退出应用。

## 开发与验证

运行测试、类型检查和构建：

```bash
npm test
npm run typecheck
npm run build
```

## 技术栈

- Electron 43
- TypeScript 5.8
- 原生 HTML/CSS
- Canvas Sprite Sheet 渲染

## 设计方向

角色差异由 `CharacterRegistry` 和 `CharacterConfig` 表达，窗口控制、桌宠移动和渲染职责保持分离。后续新增角色时，优先通过角色配置接入，而不是把角色判断散落到窗口和渲染逻辑中。
