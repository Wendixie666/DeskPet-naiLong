# 全局键盘活动监听调研

> 调研日期：2026-09-15。目标是只检测全局 keydown 活动，不记录具体按键内容。

## 结论

本轮采用 `uiohook-napi@1.5.5`。它是 `libuiohook` 的 N-API 封装，项目只注册 keydown 回调，并在适配器中丢弃事件对象，只向 `PetRuntime` 发送无参数活动信号。

当前仓库的 Electron 版本是 `43.4.1`，官方版本页显示该版本内置 Node.js `24.18.1`。N-API 不依赖某个 Electron 的旧 Node ABI；本地安装包包含 Windows x64/arm64、macOS x64/arm64 和 Linux x64/arm64/loong64 的预编译 `.node` 文件，当前 Linux x64 可加载。

## 平台边界

- Windows：`libuiohook` 使用 Windows 全局输入 hook；`uiohook-napi` 提供对应预编译模块。
- macOS：系统会限制全局键盘事件监听。Apple 的 `CGEventTapCreate` 文档说明，键盘事件 tap 需要辅助功能访问权限；Apple 用户文档中的设置位置是“系统设置 > 隐私与安全性 > 输入监控”，部分系统版本或签名状态也可能将其列在“辅助功能”。启动失败时主进程输出简短提示，不输出按键字段。
- Linux：`libuiohook` 当前的跨平台实现包含 X11 输入 hook。原生 Wayland 不提供与 X11 等价的任意应用全局键盘读取能力，`libuiohook` 的 Wayland 支持仍是未解决的开放问题。因此本项目只承诺 Linux X11/XWayland，不为原生 Wayland 增加 workaround。

## Electron 打包

`uiohook-napi` 使用 N-API 预编译文件和 `node-gyp-build` 选择当前平台/架构。electron-builder 文档说明 native module 会在打包时自动检测并从 ASAR 解包；其 native dependency rebuild 默认开启。本项目实测默认 rebuild 会因构建机缺少 X11 开发头文件而失败，因此在确认 Electron 进程可直接加载预编译 N-API 模块后设置 `npmRebuild: false`，并显式设置 `asarUnpack: ["**/*.node"]`。当前 `uiohook-napi` 放在运行时 `dependencies` 中，未额外引入 renderer 或 preload 依赖，也未修改现有 renderer 渲染逻辑。

## 来源

- [Electron v43.4.1 release page](https://releases.electronjs.org/release/v43.4.1)
- [`uiohook-napi` package manifest](https://raw.githubusercontent.com/SnosMe/uiohook-napi/master/package.json)
- [`uiohook-napi` API and N-API README](https://github.com/SnosMe/uiohook-napi)
- [`libuiohook` cross-platform implementation](https://github.com/kwhat/libuiohook)
- [Apple `CGEventTapCreate` documentation](https://developer.apple.com/documentation/coregraphics/cgevent/tapcreate%28tap%3Aplace%3Aoptions%3Aeventsofinterest%3Acallback%3Auserinfo%3A%29)
- [Apple Input Monitoring settings](https://support.apple.com/en-ca/guide/mac-help/mchl4cedafb6/mac)
- [`libuiohook` Wayland issue](https://github.com/kwhat/libuiohook/issues/100)
- [electron-builder native modules and ASAR documentation](https://www.electron.build/docs/contents/)
