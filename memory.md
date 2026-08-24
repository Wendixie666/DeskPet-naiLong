# 项目记忆

- 第一阶段技术栈确定为 Electron + TypeScript + 原生 HTML/CSS，不引入 React、数据库或状态机框架。
- 系统窗口能力集中在 `main`，召唤、拖拽和移动推进集中在 `pet` 的 `PetMotion`，显示集中在 `renderer`，角色差异由 `characters` 配置表达。
- 主进程 `summon(x, y)` 与 `PetMotion.summon()` 都使用屏幕 DIP 坐标，目标点语义是角色脚底中心；`PetMotion` 结合鼠标所在屏幕、实际窗口尺寸和角色缩放完成换算与限界。
- 原始奶蛙动作图是蓝幕横向素材板，renderer 通过角色配置切帧并在 Canvas 中实时去蓝，不改写原始素材。
- renderer 会识别每套动作的可见内容边界，按 `CharacterConfig.visual` 的统一视觉高度和脚底中心锚点缩放对齐；单个动作可用 `adjustment.scale/offset` 微调。
- 设置保存在 Electron `userData/settings.json`；`SettingsManager` 集中设置规范化、运行时应用、持久化和失败恢复；角色差异通过 `CharacterRegistry` 和 `CharacterConfig` 表达，设置只保存 `characterId`。
- Electron 主进程和 preload 保持 CommonJS；renderer 通过 `tsconfig.renderer.json` 单独编译为浏览器 ES Module，HTML 必须以 `type="module"` 加载。
- 桌宠缩放通过一次 `BrowserWindow.setBounds()` 同步位置和尺寸，成功后才提交角色与 scale 状态，避免不可缩放窗口的几何状态不同步。
- 完整窗口移动支持 Windows、macOS 和 Linux X11/XWayland；Electron 与 Tauri 在 Linux 原生 Wayland 都有程序化窗口定位限制。
