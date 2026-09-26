# 小黑桌宠动作素材调研

调研日期：2026-09-26

## 参考来源

- [opensetk/dsh-xiaohei](https://github.com/opensetk/dsh-xiaohei)，当前读取提交：`2fc2610f341c9a17426804ccfd519dc0a2f18a2a`。
- [jiang-taibai/IXiaoHei](https://github.com/jiang-taibai/IXiaoHei)，当前读取提交：`94d7eb55b85dcf10e47ad002d0417d0fb4d91436`。
- 本项目角色配置与动画实现：`src/characters/*.ts`、`src/renderer/pet-animation.ts`、`src/pet/motion.ts`。

## dsh-xiaohei 素材

仓库把动作拆成独立的 GIF/PNG，并用会话状态映射动作；点击小黑时随机播放短互动动作。已核对的动作包括：

| 素材 | 语义 | 适合在本项目中的位置 |
| --- | --- | --- |
| `main-base.png` | 正常待机 | `idle` |
| `main-wave.gif` | 打招呼、摇摆 | `wave` / 点击动作 |
| `main-run.gif` | 奔跑 | `walk` |
| `main-eat.gif` | 吃鸡腿 | 点击动作，也可作为 `typing` 或思考反馈 |
| `main-sneak-eat.gif` | 偷吃 | 点击动作 |
| `main-play-heixiu.gif` | 和嘿咻玩 | 点击动作 |
| `main-wiggle.gif` | 趴地蠕动 | 点击动作或拖拽反馈 |
| `main-roll.gif` | 翻滚 | 点击动作或提醒失败反馈 |
| `main-celebrate.gif` | 庆祝 | 提醒完成/未来任务完成反馈 |
| `main-full.gif` | 吃撑 | 未来养成/喂食结果 |
| `main-daze.png` | 发呆 | 低频随机环境动作 |
| `main-bored.png` | 无聊、趴着等 | `windowPerch` 或低频随机环境动作 |

素材清单还标注了动作尺寸与帧数：常规动作多为 200×200，奔跑为 220×220，蠕动为 240×240，翻滚为 380×200。当前渲染器能直接逐帧绘制 GIF，但翻滚需要单动作缩放，否则会超出当前约 192×208 的角色画布。

## IXiaoHei 素材与交互

仓库使用 JavaFX，把右键菜单、动作执行、临时动作恢复和简单养成状态分开实现。已核对的动作包括：

- `shake-head-txt.gif`：主待机/摇头。
- `eat drumstick.gif`、`eat-watermelon-txt.gif`：吃东西。
- `licking the claw.gif`：舔爪/清洁。
- `playing guitar.gif`：弹吉他。
- `bye.gif`：告别。
- `play heixiu.gif`：玩嘿咻。
- `smiling clouds.png`、`emotion increasing animation.png`：心情提升的独立反馈层。

交互上提供了点击随机动作、拖拽、右键菜单、食物仓库、沐浴仓库、心情/体力/清洁度等概念；食物或肥皂动作播放约 6 秒后恢复到主动作，退出时播放告别动作。

## 对本项目的结论

当前项目已有 `idle`、`walk`、点击动作、`drag`、`typing`、提醒、窗口顶部停靠和可选的注视动作。新增小黑时优先通过 `CharacterConfig` 接入，不需要为了这些动作修改通用渲染器或引入养成状态。

推荐第一批只接入高频、与现有交互语义直接对应的动作：

1. 待机：`main-base.png`
2. 行走：`main-run.gif`
3. 打招呼：`main-wave.gif`
4. 吃鸡腿：`main-eat.gif`
5. 偷吃：`main-sneak-eat.gif`
6. 玩嘿咻：`main-play-heixiu.gif`
7. 翻滚：`main-roll.gif`，单动作缩放
8. 拖拽：复用 `main-wiggle.gif` 或单独准备“被提起”素材

第二批再考虑 `celebrate`、`full`、`daze`、`bored`、舔爪、弹吉他和告别；这些更适合新增事件或设置入口，而不是直接塞进普通点击随机池。

## 版权与素材使用提醒

本次结论把两个仓库作为动作设计参考。`dsh-xiaohei` 的 README 明确说明其宠物 GIF/PNG 来自其他公开资源、仅供学习交流，并提示原作者要求时应移除；`IXiaoHei` 仓库未发现独立 LICENSE 文件。因此，正式复制素材到本项目之前应单独确认原始素材授权；未确认时建议只参考动作语义和交互设计，使用已获授权或自行绘制的小黑素材。
