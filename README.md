# DeskPet-naiLong

一个使用 Electron、TypeScript 和原生 HTML/CSS 实现的极简桌宠。当前角色是奶蛙，后续可通过角色配置增加牛来、美团袋鼠或自定义角色。

第一阶段已支持：

- 透明、无边框、置顶窗口，默认位于主屏工作区右下角；
- 点击随机切换奶蛙动作；
- 鼠标拖拽；
- 统一的 `summon(x, y)`，自动行走、切换朝向并在到达后恢复 idle；
- 数据驱动的角色动作与素材配置。

运行与验证方式见 [启动指令.md](./启动指令.md)，技术选型依据见 [桌宠技术调研](./docs/research/desktop-pet-technology.md)。
