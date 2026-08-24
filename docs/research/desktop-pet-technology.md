# 桌宠第一阶段技术选型调研：Electron 与 Tauri

> 调研日期：2026-08-24  
> 范围：透明无边框置顶窗口、窗口定位与拖拽、全局快捷键和鼠标坐标、发行体积与运行依赖、开发复杂度，以及开源桌宠项目的可借鉴实现。  
> 来源原则：只使用 Electron/Tauri 官方文档，以及开源项目自身 README、源码和 Issue。

## 结论

第一阶段建议采用 **Electron + TypeScript + 原生 HTML/CSS**。

原因不是 Tauri 做不到，而是当前目标强调“尽快得到最小可用版本、主要使用 TypeScript、结构简单、方便持续 vibe coding”。Electron 已把本阶段需要的窗口、屏幕、鼠标坐标和全局快捷键能力放在同一套 JavaScript API 中；Tauri 能实现同样主体能力，发行体积明显更小，但需要 Rust 工具链、各平台原生构建依赖、官方插件及 ACL 权限配置。对当前只有一只角色、一个透明窗口、少量行为的 MVP，Tauri 的体积收益暂不足以抵消开发和排错面的扩大。

建议把选择保留为可复核决定：先用 Electron 做完阶段一；等到安装包体积、常驻内存或分发成本成为真实问题，再用同一份 `pet` 领域逻辑和角色配置评估 Tauri 迁移，不应为假设中的未来体积问题提前引入 Rust 层。

有一个与技术栈无关的硬边界：**Linux 原生 Wayland 不能完整保证“读取全局鼠标绝对坐标，并由程序逐帧移动窗口到该坐标”**。Electron 官方明确 `screen.getCursorScreenPoint()` 与 `win.setPosition()` 不支持 Wayland；Tauri 底层官方 tao 文档同样将 Wayland 的外部窗口定位标为不支持，并说明光标位置可能返回 `(0, 0)`。因此若阶段一要求 `summon(x, y)` 完整可用，支持范围应写成 **Windows、macOS、Linux X11/XWayland**，而不是笼统承诺全部 Linux 桌面环境。来源：[Electron 鼠标坐标](https://www.electronjs.org/docs/latest/api/screen#screengetcursorscreenpoint)、[Electron 窗口定位](https://www.electronjs.org/docs/latest/api/base-window#winsetpositionxy-animate)、[tao `set_outer_position`](https://docs.rs/tao/latest/tao/window/struct.Window.html#method.set_outer_position)、[tao `cursor_position`](https://docs.rs/tao/latest/tao/window/struct.Window.html#method.cursor_position)。

## 能力逐项比较

| 维度 | Electron | Tauri 2 | 对本项目的判断 |
| --- | --- | --- | --- |
| 透明、无边框、置顶 | `BrowserWindow` 原生支持 `transparent`、`frame: false`、`alwaysOnTop`；透明窗口有若干平台限制 | `WindowOptions` 原生支持 `transparent`、`decorations: false`、`alwaysOnTop` | 两者都满足；Electron 配置路径更直接 |
| 默认右下角与多屏 | `screen.getPrimaryDisplay().workArea` / `getDisplayMatching()` 配合 `setPosition()` | 窗口 API 支持逻辑/物理坐标和 `setPosition()` | 两者都满足；应按 work area 计算，避免遮住任务栏/Dock |
| 点击与拖拽共存 | CSS drag region 会吞掉 pointer events；可改用 pointer delta → IPC → 主进程移动窗口 | `startDragging()` 能触发原生拖拽，但需 ACL 权限；也可手动调用定位 | 本项目同一区域既要点击又要拖拽，推荐显式 pointer 手势判定，不把整个角色设成 CSS drag region |
| `summon(x, y)` | 主进程读取窗口位置，按帧调用 `setPosition()`；`screen` 处理显示器和 DIP 坐标 | JS/Rust 均可 `setPosition()`；`cursorPosition()` 返回物理坐标，要处理与逻辑坐标转换 | 都能实现；Electron 的单语言路径更短 |
| 全局快捷键 | 核心模块 `globalShortcut`；Wayland 使用桌面 portal，GNOME 首次绑定有授权流程 | 需安装官方 global-shortcut plugin，并为前端调用配置 capability 权限 | 两者都能做未来入口；Electron 少一层插件/ACL |
| 鼠标绝对坐标 | `screen.getCursorScreenPoint()` 直接返回 DIP；Wayland 不支持 | `cursorPosition()` 返回桌面物理坐标，多屏坐标可为负；Wayland 受底层限制 | Electron 坐标系更贴合 `BrowserWindow.setPosition()` 的 DIP 语义 |
| 打包体积 | 内嵌 Chromium/V8/Node；官方称多数应用超过 100 MB，压缩包通常约 80–100 MB | 使用系统 WebView；官方称极简应用可小于 600 KB（不是本项目最终包体保证） | Tauri 明显占优 |
| 终端运行依赖 | Electron 自带 Node 和 Chromium，终端用户无需另装 Node | 依赖系统 WebView；Windows 默认安装器必要时下载 WebView2，离线嵌入会显著增大安装包 | Electron 包大但运行时更一致；Tauri 包小但受系统 WebView 版本影响 |
| 开发环境 | Node/npm + TS 构建；官方推荐 Forge 做打包 | Rust 必需；Windows 需 C++ Build Tools/WebView2，macOS 需 Xcode CLI，Linux 需 WebKitGTK 等系统包 | 对当前仓库和持续 vibe coding，Electron 更简单 |
| 渲染一致性 | 自带固定 Chromium 版本 | Windows 用 WebView2，macOS 用 WKWebView，Linux 用 WebKitGTK | Electron 跨平台 CSS/动画行为更一致 |

### 1. 透明、无边框和置顶

Electron 官方透明窗口示例使用 `transparent: true` 与 `frame: false`；文档也指出 Windows 的透明窗口必须是无边框窗口，并列出透明窗不可可靠 resize、开启 DevTools 时不透明、透明区域不会自动鼠标穿透等限制。置顶可由 `alwaysOnTop` 或 `setAlwaysOnTop()` 完成。来源：[Electron Custom Window Styles](https://www.electronjs.org/docs/latest/tutorial/custom-window-styles)、[Electron `setAlwaysOnTop`](https://www.electronjs.org/docs/latest/api/base-window#winsetalwaysontopflag-level-relativelevel)。

Tauri `WindowOptions` 同样提供 `transparent`、`decorations`、`alwaysOnTop`、`x`、`y`。但其官方配置文档明确：macOS 透明窗口需要启用 `macos-private-api`，这会阻止应用进入 Mac App Store；Windows 可考虑 `noRedirectionBitmap` 降低透明窗口创建时的白闪。来源：[Tauri WindowOptions](https://v2.tauri.app/reference/javascript/api/namespacewindow/#windowoptions)、[Tauri WindowConfig](https://v2.tauri.app/reference/config/#windowconfig)。

当前阶段如果不计划 Mac App Store 分发，这个 Tauri 限制不是阻断项；但它说明“透明桌宠”不是完全无成本的通用窗口配置。

### 2. 定位、拖拽和 `summon`

Electron 的 `screen` 模块提供主屏、全部显示器、work area、离某个点最近的显示器、绝对鼠标 DIP 坐标；`BrowserWindow.setPosition()` 用整数坐标移动系统窗口。来源：[Electron screen](https://www.electronjs.org/docs/latest/api/screen)、[Electron `setPosition`](https://www.electronjs.org/docs/latest/api/base-window#winsetpositionxy-animate)。

Electron 的 CSS `app-region: drag` 适合自定义标题栏，但官方强调 drag 区域会忽略所有 pointer events。这与“同一个奶蛙既响应点击，又支持拖拽”的需求冲突。MVP 更适合在 renderer 中区分 pointer down/move/up：超过少量阈值即视为拖拽，通过受限 preload API 把位移发给 main；未超过阈值则视为点击。来源：[Electron Custom Window Interactions](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions#custom-draggable-regions)。

Tauri 提供 `setPosition()`、`cursorPosition()` 和 `startDragging()`；前端调用拖拽需要在 capability 中开放相应权限。其 `cursorPosition()` 返回物理像素，而窗口位置可以是逻辑或物理位置，因此实现时必须显式选择坐标类型，不能混用。来源：[Tauri `setPosition`](https://v2.tauri.app/reference/javascript/api/namespacewindow/#setposition)、[Tauri `cursorPosition`](https://v2.tauri.app/reference/javascript/api/namespacewindow/#cursorposition)、[Tauri `startDragging`](https://v2.tauri.app/reference/javascript/api/namespacewindow/#startdragging)、[Tauri Window Customization](https://v2.tauri.app/learn/window-customization/)。

对两种技术栈，推荐同一条行为边界：renderer/pet 只计算目标方向、状态和下一步位置；真正的 OS 窗口读取与移动由 main（Electron）或 Tauri window adapter 承担。这样 `summon(x, y)` 不依赖角色名，也不会把系统 API 散落进动画代码。

### 3. 全局快捷键和鼠标坐标

Electron 的 `globalShortcut` 是核心模块，失焦时仍可工作。Linux X11 直接抓取快捷键；Wayland 通过 `org.freedesktop.portal.GlobalShortcuts`，GNOME 首次绑定会显示授权窗口，而且应用必须有有效的 desktop identity。来源：[Electron globalShortcut](https://www.electronjs.org/docs/latest/api/global-shortcut)。

Tauri 需要安装官方 global-shortcut plugin；桌面三平台均列为支持，但潜在危险命令默认关闭，需要在 capability 中显式开放 register/unregister 权限。来源：[Tauri Global Shortcut](https://v2.tauri.app/plugin/global-shortcut/)。

因此未来的调用链在 Electron 中可以保持为：

```text
globalShortcut callback
  -> screen.getCursorScreenPoint()
  -> interaction.summon(x, y)
  -> pet 计算方向/移动帧
  -> main.setPosition(nextX, nextY)
  -> 到达后 pet 恢复 idle
```

这与用户给出的后续方向完全一致，第一阶段只需先保留一个可测试或调试调用入口，不需要现在注册全局快捷键。

### 4. 体积、运行依赖和开发复杂度

Electron 把 Chromium、V8、Node.js 放进应用二进制。官方直接说明多数 Electron 应用超过 100 MB，压缩后通常约 80–100 MB；代价换来固定的渲染/Node 运行环境，终端用户不需要安装系统 Node。来源：[Why Electron](https://www.electronjs.org/docs/latest/why-electron#why-bundle-anything-at-all)、[Electron Prerequisites](https://www.electronjs.org/docs/latest/tutorial/tutorial-prerequisites)。Electron 核心不负责完整打包流程，官方推荐 Electron Forge。来源：[Electron Packaging](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging)。

Tauri 使用系统原生 WebView，官方称极简应用可以小于 600 KB。Windows 使用 WebView2，macOS 使用 WKWebView，Linux 使用 WebKitGTK，因此包体小，但前端运行环境随操作系统变化。来源：[What is Tauri](https://v2.tauri.app/start/#smaller-app-size)、[Tauri Webview Versions](https://v2.tauri.app/reference/webview-versions/)。Windows 安装器默认在缺少 WebView2 时下载 bootstrapper；若要求完全离线，嵌入 offline installer 约增加 127 MB，固定版本 runtime 约增加 180 MB。来源：[Tauri Windows Installer](https://v2.tauri.app/distribute/windows-installer/#webview2-installation-options)。

Tauri 开发环境必须安装 Rust；Windows 还需 Microsoft C++ Build Tools 与 WebView2，macOS 需 Xcode 或 Command Line Tools，Linux 需发行版对应的 WebKitGTK 等系统依赖。来源：[Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)。这些都是合理的工程成本，但与本阶段“尽量只有 TS/HTML/CSS”的目标不一致。

## 开源桌宠项目可借鉴点

### BongoCat（Tauri，成熟跨平台参照）

项目：[ayangweb/BongoCat](https://github.com/ayangweb/BongoCat)

项目自身 README 明确使用 Tauri，支持 macOS、Windows 和 Linux **X11**，并支持导入自定义模型。这是重要的现实验证：Tauri 很适合做成熟、轻量的跨平台桌宠，但项目也没有把 Linux 支持泛化为原生 Wayland。来源：[BongoCat README](https://github.com/ayangweb/BongoCat#readme)。

可借鉴：

- 对 Linux 支持范围写清 X11，不掩盖窗口系统差异。
- 把模型做成可导入资源，而不是把某个角色写死在行为层。
- 透明窗口要同时处理原生窗口与页面根元素；其项目 Issue 中，macOS 透明窗口白框最终涉及图片解码、CSS 透明背景、关闭阴影与原生 panel 配置，说明透明效果必须在目标系统实测。来源：[BongoCat 透明窗口白框 Issue #999](https://github.com/ayangweb/BongoCat/issues/999)。

不建议阶段一照搬：Vue、Pinia、多窗口偏好设置、输入监听与完整模型生态都超出本项目 MVP。

### VPet（成熟桌宠的角色/渲染分层参照）

项目：[LorisYounger/VPet](https://github.com/LorisYounger/VPet)

VPet 是 Windows/WPF 项目，不是候选技术栈，但其项目结构把窗口控制器、核心逻辑、角色图形加载器与动画显示拆开，并通过 MOD 支持替换动画、对话、主题和插件。来源：[VPet README 的软件结构与 MOD 能力](https://github.com/LorisYounger/VPet#软件结构)。

可借鉴：

- 系统窗口控制与角色行为、动画渲染分开。
- 角色素材由 loader/config 解释，行为只依赖通用状态名。
- 第一阶段只采用“角色配置 + 动画资源”的最小数据驱动部分，不引入 MOD 管理器或插件系统。

### TonyNa-code/desktop-pet（Electron 角色包参照）

项目：[TonyNa-code/desktop-pet](https://github.com/TonyNa-code/desktop-pet)

该项目使用 Electron，角色包是 `character.json + sprite.png + preview.png`，manifest 描述动作行、帧数和播放速度；基础动作包含 `idle`、`runningRight`、`runningLeft` 等。来源：[项目 README](https://github.com/TonyNa-code/desktop-pet#character-packs)、[示例角色目录](https://github.com/TonyNa-code/desktop-pet/tree/main/assets/characters/default)。

可借鉴：

- `characters/<id>/character.json` 与素材同目录，新增角色无需改 pet 核心逻辑。
- 面向行为的通用状态名优于角色专属命名；本项目至少定义 `idle`、`walkLeft`、`walkRight` 和若干 click 候选状态。
- 配置只描述现有素材真正需要的信息；如果奶蛙当前是独立 GIF/PNG，不要为未来 spritesheet 预建复杂 schema。

### kokoronoka/desktopPet（Electron 最小窗口移动参照）

项目：[kokoronoka/desktopPet](https://github.com/kokoronoka/desktopPet)

虽然项目规模小，但实现与本阶段高度同构：一个透明无边框置顶窗口、原生 HTML/CSS/JS、点击和拖拽并存、主进程负责实际窗口移动。其源码通过主屏 work area 计算右下角默认位置，验证保存位置仍在现有显示器内；renderer 传递拖拽 delta，main 用 `getPosition()` / `setPosition()` 移动窗口；自动行走也由 main 按 16 ms 步进并通知 renderer 朝向。来源：[项目 README 的 tricky bits](https://github.com/kokoronoka/desktopPet#how-the-tricky-bits-work)、[窗口与拖拽源码](https://github.com/kokoronoka/desktopPet/blob/main/main.js#L33-L146)、[行走源码](https://github.com/kokoronoka/desktopPet/blob/main/main.js#L197-L255)。

可借鉴：

- 初始位置基于 `workArea`，不要硬编码屏幕分辨率。
- 主进程拥有窗口位置与屏幕边界，renderer 只发送交互意图/位移。
- 用少量移动阈值区分点击和拖拽，避免两个交互互相触发。
- 移动开始先取消已有移动；同一时刻只允许一个窗口移动任务。
- 每一步传整数坐标并限制在目标显示器可用区域。

不建议照搬：将状态持久化、托盘、自动漫游、角色选择器全部放入单个 `main.js`。本项目已有明确的 `main / pet / interaction / renderer / characters` 边界，应保留，但每层只放一两个职责明确的文件。

## 对第一阶段实现的直接建议

1. 选 Electron，但将 OS 能力收口在 `main` 和窄 preload bridge；renderer 不直接获得 Node 能力。
2. `characters/<id>/character.ts`（或 JSON）只描述展示名、尺寸、状态到素材的映射、每个状态是否循环；不要出现奶蛙专属条件分支。
3. `pet` 保存最小状态：当前 action、朝向、当前位置、当前移动任务；不引入状态机库。
4. `interaction.summon(x, y)` 作为唯一主动移动入口。新调用应取消旧移动；逐帧根据目标向量选择左右朝向，到达阈值后设为 `idle`。
5. 拖拽使用 pointer 手势与 IPC，pointer up 时仅在移动距离小于阈值才触发点击切换状态。
6. 坐标统一使用 Electron DIP；未来全局快捷键返回的 `getCursorScreenPoint()` 可直接传给 `summon`。角色窗口锚点要明确，例如把目标解释为角色脚底中心，而不是窗口左上角。
7. Windows/macOS/X11(XWayland) 作为阶段一完整支持范围；原生 Wayland 明确降级或暂不支持 summon，不做脆弱的兼容伪装。
8. 暂不引入托盘、自动启动、持久化、设置页、插件系统、画圈识别和全局输入监听。

## 需要在实现后验证的风险

- 至少在当前开发系统实机验证透明边缘、阴影、点击与拖拽；透明窗口在不同窗口管理器/GPU 下可能不同。
- 双屏且副屏位于主屏左侧或上方时，坐标可能为负；`summon` 和边界限制不能假定 `(0, 0)` 是整个桌面的左上角。
- 高 DPI 下 renderer 的 CSS 像素、pointer delta 与 Electron DIP 是否一致，需要一次实际拖拽测试。
- 全屏应用上方的置顶层级、跨 macOS Space 行为属于平台体验问题，阶段一不要仅凭 API 存在就宣称完全一致。
- 如果后续必须进入 Mac App Store，需重新比较 Electron 与 Tauri 的透明窗分发约束，而不是沿用本次“直接分发”前提。
