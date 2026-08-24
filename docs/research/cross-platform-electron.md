# Electron 跨平台兼容性核查

## 结论

- 桌宠窗口当前使用 `BrowserWindow` 的透明、无边框、置顶和程序化定位能力。Windows、macOS 和 Linux X11/XWayland 可以继续作为目标平台。
- Electron 官方明确说明，原生 Wayland 通常不允许应用在没有用户输入时程序化移动、定位或调整窗口，因此当前 `summon(x, y)` 和逐帧移动不应承诺支持原生 Wayland。需要时可使用 XWayland 启动。
- Linux X11 的全局快捷键由 X server 直接捕获；Wayland 通过 `org.freedesktop.portal.GlobalShortcuts`，需要有效的 desktop identity。当前项目尚未配置 `.desktop` 文件或 `desktopName`，因此不能把原生 Wayland 快捷键注册视为已支持。
- Electron 的透明窗口在 Windows 需要无边框窗口；项目的桌宠窗口已经同时设置 `transparent: true` 和 `frame: false`。透明窗口不可点击穿透，且 Electron 官方提示透明窗口的可调整大小能力存在平台限制；项目桌宠窗口本身不可调整大小，符合这一约束。
- macOS 通常在最后一个窗口关闭后仍保持应用运行，并通过 `activate` 重新创建窗口。项目当前无条件在 `window-all-closed` 中调用 `app.quit()`，这是 macOS 生命周期兼容性问题，应改为仅在非 macOS 平台退出。

## 建议范围

本轮只修复 macOS 生命周期、补充平台能力说明和安装文档；不引入 Wayland portal、`.desktop` 打包身份或完整 Electron 打包系统。设置窗口的 acrylic/透明主题不作为跨平台承诺，必要时降级为普通不透明窗口。

## 依据

- [Electron `BrowserWindow` 官方文档](https://www.electronjs.org/docs/latest/api/browser-window/)：Wayland 的窗口定位、移动和调整大小限制。
- [Electron 透明窗口官方教程](https://www.electronjs.org/docs/latest/tutorial/custom-window-styles)：透明窗口的平台限制。
- [Electron `globalShortcut` 官方文档](https://www.electronjs.org/docs/latest/api/global-shortcut/)：X11 与 Wayland 的全局快捷键机制及 portal identity 要求。
- [Electron `app` 官方文档](https://www.electronjs.org/docs/latest/api/app/)：`window-all-closed` 和 macOS `activate` 生命周期。
- [Electron Accelerator 官方文档](https://www.electronjs.org/docs/latest/api/accelerator)：`CommandOrControl` 与 `Alt` 的跨平台写法。
