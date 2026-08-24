# 项目记忆

- 第一阶段技术栈确定为 Electron + TypeScript + 原生 HTML/CSS，不引入 React、数据库或状态机框架。
- 系统窗口能力集中在 `main`，通用角色行为集中在 `pet`，输入编排集中在 `interaction`，显示集中在 `renderer`，角色差异由 `characters` 配置表达。
- `summon(x, y)` 使用屏幕 DIP 坐标，目标点语义是角色脚底中心；到达后恢复 `idle`。
- 原始奶蛙动作图是蓝幕横向素材板，renderer 通过角色配置切帧并在 Canvas 中实时去蓝，不改写原始素材。
- 完整窗口移动支持 Windows、macOS 和 Linux X11/XWayland；Electron 与 Tauri 在 Linux 原生 Wayland 都有程序化窗口定位限制。
