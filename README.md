# DeskPet-naiLong

一个使用 Electron、TypeScript 和原生 HTML/CSS 实现的极简桌宠。当前角色是奶蛙，后续可通过角色配置增加牛来、美团袋鼠或自定义角色。

当前已支持：

- 透明、无边框、置顶窗口，默认位于主屏工作区右下角；
- 点击随机切换奶蛙动作；
- 鼠标拖拽；
- 统一的 `summon(x, y)`，自动行走、切换朝向并在到达后恢复 idle；
- 按统一视觉尺寸和脚底中心锚点渲染所有动作；
- 全局快捷键将桌宠召唤到当前鼠标所在屏幕；
- 右键打开独立设置窗口，可设置角色、大小、默认位置和召唤快捷键；
- 基于 `CharacterRegistry` 和 `CharacterConfig` 的数据驱动角色配置。

运行与验证方式见 [启动指令.md](./启动指令.md)，技术选型依据见 [桌宠技术调研](./docs/research/desktop-pet-technology.md)。
