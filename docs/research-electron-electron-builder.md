# 调研纪要：Electron 窗口 API 与 electron-builder 打包配置

> 调研日期：2026-08-25。全部结论来自 Electron 官方文档（electronjs.org/docs/latest）与 electron-builder 官方文档（www.electron.build，v27 版本文档结构）。

## 1. setVisibleOnAllWorkspaces / setAlwaysOnTop（macOS）

**结论**

- `win.setVisibleOnAllWorkspaces(visible[, options])` 仅 macOS/Linux 有效，Windows 上是 no-op。macOS 上默认会在 `UIElementApplication` 与 `ForegroundApplication` 之间转换进程类型以保证行为正确——副作用是**每次调用都会让窗口和 Dock 图标短暂消失**。
- `options.visibleOnFullScreen: true`（仅 macOS）：让窗口显示在全屏窗口**之上**，即覆盖其他 App 的全屏 Space。这是桌面宠物类应用覆盖全屏视频/游戏的关键开关。
- `options.skipTransformProcessType: true`：若进程已是 UIElementApplication（即已隐藏 Dock），可跳过上述转换，避免闪烁。
- `win.setAlwaysOnTop(flag[, level][, relativeLevel])`：level 取值 `normal | floating | torn-off-menu | modal-panel | main-menu | status | pop-up-menu | screen-saver`（`dock` 已废弃）。`flag=true` 时默认 level 为 `floating`；`flag=false` 时重置为 `normal`。
- 分层规则（macOS）：`floating` 到 `status`（含）之间的层级位于 **Dock 之下**；`pop-up-menu` 及以上位于 **Dock 之上**。要在全屏 Space 上稳定悬浮，需配合 `visibleOnFullScreen: true` + 较高层级（如 `screen-saver`）。Apple 不建议在 `screen-saver` 之上再叠超过 1 层。

**签名**

```ts
win.setVisibleOnAllWorkspaces(visible: boolean, options?: {
  visibleOnFullScreen?: boolean   // macOS：显示于全屏窗口之上
  skipTransformProcessType?: boolean // macOS：跳过进程类型转换，避免窗口/Dock 闪烁
})
// Windows 上此 API 无效果

win.setAlwaysOnTop(flag: boolean,
  level?: 'normal'|'floating'|'torn-off-menu'|'modal-panel'
        |'main-menu'|'status'|'pop-up-menu'|'screen-saver',
  relativeLevel?: number) // 默认 0；Apple 不建议高于 screen-saver+1
```

典型用法：

```js
if (process.platform === 'darwin') {
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
}
```

来源：
- https://www.electronjs.org/docs/latest/api/base-window#winsetvisibleonallworkspacesvisible-options-macos-linux
- https://www.electronjs.org/docs/latest/api/base-window#winsetalwaysontopflag-level-relativelevel

## 2. skipTaskbar、隐藏 Dock 图标、activation policy

**结论**

- `skipTaskbar` 构造选项标注为 *macOS* *Windows* 有效（Linux 无效），作用是"不在任务栏中显示该窗口"。macOS 上它影响的是窗口是否出现在 Dock 的窗口分组里，**不等于隐藏整个 App 的 Dock 图标**。
- 隐藏 Dock 图标的官方做法是运行时调用 `app.dock.hide()`（`Dock.hide()`，仅 macOS）。已知问题：距上次调用不足 1 秒内的再次调用无效，需至少间隔约 1 秒（官方建议 `setTimeout` ≥1100ms）。
- 另一条路径是 `app.setActivationPolicy(policy)`（仅 macOS）：`'regular'` 普通 App（有 Dock 图标）、`'accessory'` 不出现在 Dock 且无菜单栏、`'prohibited'` 不出现在 Dock 且不能创建窗口。对应原生 `LSUIElement`（accessory）语义；Electron 文档未直接提 LSUIElement 字符串，但 accessory 即其运行时等价物。打包期静态声明则是在 Info.plist 设 `LSUIElement=true`（由 electron-builder `extendInfo` 注入）。

**关键 API**

```js
app.dock.hide()          // 隐藏 Dock 图标（macOS）
app.dock.show()          // 返回 Promise<void>
app.dock.isVisible()
app.setActivationPolicy('accessory' | 'regular' | 'prohibited')

new BrowserWindow({ skipTaskbar: true }) // mac/win 下窗口不进任务栏
```

来源：
- https://www.electronjs.org/docs/latest/api/dock#dockhide-macos
- https://www.electronjs.org/docs/latest/api/app#appsetactivationpolicypolicy-macos
- https://www.electronjs.org/docs/latest/api/base-window （skipTaskbar 选项）

## 3. transparent + frameless 窗口在 macOS 的限制

**结论**

- 官方透明窗口示例即使用 `frame: false + transparent: true + resizable: false` 组合。
- 官方 Limitations 明确：
  - 透明区域**不可点击穿透**（issue #1335）；
  - 透明窗口**不可 resize**，设 `resizable: true` 在部分平台会导致透明窗口失效；
  - CSS `blur()` 只作用于自身内容，无法模糊窗口下层内容；
  - 打开 DevTools 时透明失效；
  - macOS：透明窗口**不显示原生窗口阴影**；
  - Windows：不能用系统菜单/双击标题栏最大化。
- macOS 上 `transparent` 本身不强依赖 `frame:false`（Windows 上明确"必须 frameless 才生效"），但要做异形桌面宠物，实践上应同时设 `frame:false` 与 `resizable:false`。

```js
const win = new BrowserWindow({
  width: 100, height: 100,
  frame: false,        // 无边框
  resizable: false,    // 透明窗口不可 resize，true 可能失效
  transparent: true
})
// 页面 body 背景 rgba(0,0,0,0)
```

来源：https://www.electronjs.org/docs/latest/tutorial/custom-window-styles#transparent-windows

## 4. electron-builder 配置要点（v27 文档）

### mac 目标与 arch

- 可选 target：`default`(=dmg+zip)、`dmg`、`zip`、`pkg`、`mas`、`mas-dev`、`7z`、`tar.*`、`dir`。**默认 `dmg`+`zip`**（Squirrel.Mac 自动更新要求两者都在）。
- arch：CLI `--x64 / --arm64 / --universal`；universal 用 fat binary 合并两架构，选项有 `mergeASARs`（默认 true）、`singleArchFiles`、`x64ArchFiles`（置于 `mac.universal` 下）。推荐 arm64 在 Apple Silicon、x64 在 Intel 上分别构建。

```yaml
mac:
  target:
    - target: dmg
      arch: [arm64, x64]     # 或 universal
  universal:
    mergeASARs: true
```

### mac.category

- 对应 Finder "按应用类别整理"，写入 Info.plist 的 LSApplicationCategoryType，如 `"public.app-category.developer-tools"`；合法值见 Apple LaunchServices Keys 文档。

### 图标格式与尺寸

| 平台 | 接受格式 | 最低 | 推荐 |
|---|---|---|---|
| macOS | `.svg/.png/.icns/.icon` | 512×512 | 1024×1024 或 SVG |
| Windows | `.svg/.png/.ico` | 256×256 | 512×512 或 SVG |
| Linux | `.svg/.png/目录` | 256×256 | SVG 或 1024×1024 PNG |

- 默认路径 `build/icon.icns`（mac）、`build/icon.ico`（win）；放一个 `build/icon.svg` 或 1024×1024 `icon.png` 即可全平台自动转换。icns 会生成 16→1024 全套尺寸；DMG 背景 `build/background.png` 540×380（Retina 1080×760 `background@2x.png`）。

### win nsis 与 ico

- win 默认 target 是 `nsis`；ico 默认 `build/icon.ico`（≥256×256）。NSIS 一键安装只用 app 图标；向导模式额外用 `installerHeader.bmp` 150×57、侧边栏 bmp 164×314（24 位 RGB、无 alpha）。

### linux AppImage/deb 与 png 图标

- Linux 默认 target 是 `AppImage`（另有 deb/rpm/snap/flatpak…）；AppImage 不要再套 zip/tar。
- 图标：PNG 目录命名 `NxN.png`（如 `256x256.png`、`512x512.png`），推荐尺寸 16/24/32/48/64/96/128/256/512；未指定时会从 icns 自动生成。deb 有内置 `depends` 默认列表（libgtk-3-0 等）。

### directories 与 files

```yaml
directories:
  output: dist              # 产物输出目录，默认 "dist"
  buildResources: build     # 图标/背景等静态资源目录，默认 "build"
  app: .                    # 应用目录，默认依次找 app、www、项目根

files:                      # 相对 app 目录的 glob
  - "**/*"
  - "!src/**"
  - "!**/*.map"
extraResources:             # 复制到 Contents/Resources（mac）/ resources/
  - from: assets/pet
    to: pet
```

- `files` 自定义时若含非 `!` 开头的包含模式，默认 `**/*` 不会自动附加；devDependencies 永远不会被打包；`package.json` 与生产 node_modules 始终包含。

### appId 规范

- 反向 DNS 格式：`com.yourcompany.appname`；作为 macOS CFBundleIdentifier 和 Windows（NSIS）Application User Model ID。默认值 `com.electron.${name}`，强烈建议显式设置；发布后更改会破坏既有用户数据路径（NSUserDefaults、沙盒容器等）。MAS 提交须唯一。

来源：
- https://www.electron.build/docs/mac （target/arch/appId/category/sign）
- https://www.electron.build/docs/features/icons-and-images
- https://www.electron.build/docs/win 、https://www.electron.build/docs/linux
- https://www.electron.build/docs/configuration 、https://www.electron.build/docs/contents
- https://www.electron.build/docs/api/app-builder-lib.Interface.MetadataDirectories （output/buildResources 默认值）

## 5. 代码签名 / 公证环境变量（只列名字和用途）

| 变量 | 用途 |
|---|---|
| `CSC_LINK` | 证书来源：HTTPS URL / `file://` / 本地路径 / base64 编码的 `.p12`/`.pfx` |
| `CSC_KEY_PASSWORD` | 解密 CSC_LINK 证书的密码 |
| `CSC_NAME` | （macOS）钥匙串中的证书 identity 名称，多证书时用于选择 |
| `CSC_IDENTITY_AUTO_DISCOVERY` | true/false，macOS 是否自动从钥匙串选有效身份 |
| `CSC_KEYCHAIN` | 未设 CSC_LINK 时使用的钥匙串名 |
| `CSC_INSTALLER_LINK` / `CSC_INSTALLER_KEY_PASSWORD` | PKG 安装包签名的 Developer ID Installer 证书及密码 |
| `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` | Windows 证书及密码；未设时回退到 CSC_LINK / CSC_KEY_PASSWORD |
| `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` | Azure Trusted Signing 认证三件套 |
| `APPLE_ID` | 公证用 Apple ID（方式二之一） |
| `APPLE_APP_SPECIFIC_PASSWORD` | 该 Apple ID 的 App 专用密码 |
| `APPLE_TEAM_ID` | Apple 开发者团队 ID |
| `APPLE_API_KEY` / `APPLE_API_KEY_ID` / `APPLE_API_ISSUER` | App Store Connect API Key 公证方式（官方推荐，更安全） |
| `APPLE_KEYCHAIN` / `APPLE_KEYCHAIN_PROFILE` | 从钥匙串读取公证凭据（notarytool profile 方式） |

- 触发公证需三组之一（API Key / APPLE_ID 组合 / Keychain profile）；CI 中配合 `forceCodeSigning: true` 防止漏签静默出包。

来源：
- https://www.electron.build/docs/features/code-signing/
- https://www.electron.build/docs/mac （notarize 选项下的三组变量）
