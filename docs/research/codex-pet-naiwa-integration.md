# “大奶蛙”接入 DeskPet-naiLong 的事实依据

> 调研日期：2026-09-26  
> 外部仓库：[`timerring/codex-pet-naiwa`](https://github.com/timerring/codex-pet-naiwa)  
> 核对版本：外部仓库 `main`，提交 `3c0cd7ca231f02e0d4d6956fc6ce86eb9f0cfb50`

## 结论摘要

外部仓库提供的是一个面向 Codex 宠物格式的资源包，不是可直接导入当前项目的角色配置。它的桌面端主素材是一个 `1536 × 2288` 的透明 WebP 多行精灵表；当前项目的 [`src/renderer/pet-animation.ts`](../../src/renderer/pet-animation.ts) 只支持从单张图片中按整张高度、横向等分读取帧。

因此有两条接入路径：

1. **推荐的最小路径**：保留当前渲染协议，把外部精灵表按动作行切出若干横向 Sprite Sheet，再新增角色配置、注册角色并加入打包资源清单。这样不需要改通用渲染器。
2. **直接使用原始精灵表**：扩展角色动作类型以描述网格的行列或帧坐标，并修改 renderer 的裁剪逻辑及测试。这样保留一份原始素材，但改动面更大，且外部仓库没有提供动作行坐标的机器可读元数据，需要自行维护映射。

调研阶段只做资料整理；后续已按推荐的最小路径复制原始来源图集，并生成当前 renderer 使用的对齐素材。

## 外部仓库事实

### 文件结构

外部仓库 README 的“文件结构”列出：

```text
naifrog/
├── pet.json
├── spritesheet.webp
├── web-spritesheet.png
└── previews/
    ├── chatgpt-web-pet.png
    └── …
```

来源：外部 [`README.md`](https://github.com/timerring/codex-pet-naiwa/blob/3c0cd7ca231f02e0d4d6956fc6ce86eb9f0cfb50/README.md#文件结构) 和目录中的实际文件。

| 外部路径 | 事实用途 | 接入当前项目的判断 |
| --- | --- | --- |
| `naifrog/pet.json` | 宠物元数据；当前内容为 `id: "nailong"`、`displayName: "奶蛙"`、`spriteVersionNumber: 2`、`spritesheetPath: "spritesheet.webp"` | 可作为资料参考，当前项目不会自动读取该 JSON |
| `naifrog/spritesheet.webp` | README 标注的 Codex v2 桌面端动画精灵表 | 桌面端接入所需的主素材；当前 renderer 不能直接按网格读取 |
| `naifrog/web-spritesheet.png` | ChatGPT Web 端上传素材；README 明确与桌面端素材用途不同 | 不应作为当前 Electron 桌宠运行素材 |
| `naifrog/previews/*.png` | README 展示用的动作预览 | 不影响外部桌宠运行，接入当前项目也不是必需资源 |
| `README.md` / `README.en.md` | 安装方式、动作名称、帧数、尺寸说明、致谢与许可证说明 | 是本次动作和授权判断的主要来源 |
| `LICENSE` | MIT License 文本，版权声明为 `Copyright (c) 2026 timerring` | 若复制受该许可覆盖的内容，应保留版权和许可文本 |

外部 README 还说明：桌面端把 `naifrog` 文件夹复制到 Codex 的 pets 目录；Web 端使用单独的 `web-spritesheet.png`。这证明该仓库的目录结构服务于 Codex 宠物加载器，不等同于当前项目的 `CharacterConfig` 结构。来源：[`README.md` 的手动安装和 Web 端说明](https://github.com/timerring/codex-pet-naiwa/blob/3c0cd7ca231f02e0d4d6956fc6ce86eb9f0cfb50/README.md#手动安装)。

### 许可证与第三方素材边界

外部 README 写明“本仓库原创内容使用 MIT License”，同时明确 Credits 中的第三方素材不在 MIT 授权范围内；Credits 指向 [`Nitrogen216/awesome_pets`](https://github.com/Nitrogen216/awesome_pets) 和 [`LynnShaw/naiwa-pet`](https://github.com/LynnShaw/naiwa-pet)。许可原文见外部 [`LICENSE`](https://github.com/timerring/codex-pet-naiwa/blob/3c0cd7ca231f02e0d4d6956fc6ce86eb9f0cfb50/LICENSE)。

因此，接入前应按“具体素材来源”确认授权，不能仅因为仓库根目录有 MIT License，就把 Credits 涉及的第三方图像一并视为 MIT。若复制外部仓库中由作者原创且受 MIT 覆盖的文件，至少应在发行物或项目说明中保留 MIT 的版权与许可文本；若无法确认精灵表各部分的来源，建议先取得作者对该资源的明确授权或保留来源说明。

### Spritesheet 尺寸、网格与动作布局

外部 README 明确给出：

- `naifrog/spritesheet.webp`：`1536 × 2288`；
- `naifrog/web-spritesheet.png`：`1536 × 1872`，仅用于 Web 上传，不能直接替代桌面端素材；
- 桌面端动作预览的帧数：`idle` 6、`waving` 4、`jumping` 5、`running-left` 8、`running` 6、`running-right` 8、`waiting` 6、`review` 6、`failed` 8；另有 16 个注视方向。

来源：外部 [`README.md` 的动画预览](https://github.com/timerring/codex-pet-naiwa/blob/3c0cd7ca231f02e0d4d6956fc6ce86eb9f0cfb50/README.md#动画预览) 和 [`README.md` 的 Web 端尺寸说明](https://github.com/timerring/codex-pet-naiwa/blob/3c0cd7ca231f02e0d4d6956fc6ce86eb9f0cfb50/README.md#关于-web-端)。

对外部 [`naifrog/spritesheet.webp`](https://github.com/timerring/codex-pet-naiwa/blob/3c0cd7ca231f02e0d4d6956fc6ce86eb9f0cfb50/naifrog/spritesheet.webp) 做图像检查后，可以确认：

- 它可按 **8 列 × 11 行** 切分；每个网格 cell 为 **192 × 208**，因为 `1536 ÷ 8 = 192`、`2288 ÷ 11 = 208`；
- 动作不是横向排列在一行，而是每个动作占一行，空白 cell 用于补齐 8 列；
- 第 2～9 行可与 README 的动作预览首帧逐一对应；第 10～11 行合计 16 个注视方向；
- 第 1 行按 README 标记为 `idle` 6 帧，但图像按 192 × 208 网格检查时可见 7 个非空 cell。这个“README 帧数与图像占位不一致”需要在实现前确认；安全做法是不要擅自把第 7 个 cell 当成正式 idle 帧，先按作者声明的 6 帧验证。

按 README 动作名、预览图和图像行位得到的工作映射如下。这里的“行”从 1 开始；“列”从左到右从 1 开始：

| 行 | 外部动作 | README 声明帧数 | 图像中建议检查的 cell | 备注 |
| ---: | --- | ---: | --- | --- |
| 1 | `idle` | 6 | 第 1～6 列；第 7 列需确认 | 存在 1 个额外非空 cell |
| 2 | `running-right` | 8 | 第 1～8 列 | 向右移动 |
| 3 | `running-left` | 8 | 第 1～8 列 | 向左移动 |
| 4 | `waving` | 4 | 第 1～4 列 | 招手 |
| 5 | `jumping` | 5 | 第 1～5 列 | README 中文描述为捧腹大笑 |
| 6 | `failed` | 8 | 第 1～8 列 | 失败或阻塞 |
| 7 | `waiting` | 6 | 第 1～6 列 | 等待输入 |
| 8 | `running` | 6 | 第 1～6 列 | README 描述为执行任务 |
| 9 | `review` | 6 | 第 1～6 列 | 完成待查看 |
| 10～11 | `look directions` | 16 个方向 | 两行各 8 列 | 可作为 16 方向序列；具体方向顺序仍应以实现时的视觉验证为准 |

外部仓库没有在 `pet.json` 或其他文本文件中声明上述行列映射、播放时长、脚底锚点或窗口尺寸；这些是接入当前框架时需要补充的角色配置事实。`pet.json` 只声明精灵表路径和版本号，见外部 [`naifrog/pet.json`](https://github.com/timerring/codex-pet-naiwa/blob/3c0cd7ca231f02e0d4d6956fc6ce86eb9f0cfb50/naifrog/pet.json)。

## 当前项目的接入约束

### 当前框架已经提供的能力

当前项目的 [`src/shared/types.ts`](../../src/shared/types.ts) 已定义：

- `image`：整张图片作为单帧；
- `sprite`：一张图片按 `frameCount` 横向等分；
- `directional-sprite`：两张横向精灵表，每张由 `frameCount` 帧组成，并由固定的 16 方向映射选择帧或镜像。

[`src/renderer/pet-animation.ts`](../../src/renderer/pet-animation.ts) 的 `drawFrame()` 使用 `source.naturalWidth / frameCount` 计算单帧宽度，帧的高度始终使用整张图片高度；`drawDirectionalFrame()` 也只在两张图片内按横向帧索引裁剪。因此，原始 `1536 × 2288` 多行 WebP **不能只通过新增一个 `CharacterConfig` 就直接工作**。

同时，[`src/renderer/pet-assets.ts`](../../src/renderer/pet-assets.ts) 的资源加载器只负责按路径加载图片，并不理解精灵表布局；WebP 本身可以作为浏览器图片资源加载，但“能加载”不等于“能按外部网格正确裁帧”。

### 推荐的最小接入方案：先转换资源格式

把外部精灵表在资源准备阶段切成当前 renderer 能使用的横向条带，例如：

- `idle`：1 张 6 帧横向条带；
- `walk`：选择 `running-left` 或 `running-right` 的 8 帧横向条带，配合当前 `facing` 镜像逻辑；
- `waving`、`jumping`、`failed`、`waiting`、`running`、`review`：各自一张横向条带；
- 16 方向：将第 10、11 行分别导出为两张 8 帧横向条带，以适配现有 `directional-sprite` 的两资源模型；导出后仍需目测确认 `directionFrame()` 的方向顺序是否匹配；
- 需要拖拽、提醒、窗口停靠时，从现有动作中选择稳定帧，或补充单帧资源；外部仓库没有这些当前项目专用动作。

这个方案的好处是：不需要让通用 renderer 认识“第几行第几列”，只需像现有 `素材/奶蛙/processed` 一样提供已处理的透明横向素材。当前的 [`tools/preprocess_sprite.py`](../../tools/preprocess_sprite.py) 主要面向一张图片中的横向帧检测或等宽横向网格，不能直接表达“从一个 8 × 11 大网格按指定行导出多个动作”；因此需要一次性的外部切图步骤，或另写一个专门的资源转换工具。该工具不是本次调研要修改的文件。

### 如果坚持直接读取原始 spritesheet

需要至少重新设计动作数据和裁帧逻辑：

- [`src/shared/types.ts`](../../src/shared/types.ts)：增加网格 cell 尺寸、行号/列号或显式帧矩形等字段；
- [`src/renderer/pet-animation.ts`](../../src/renderer/pet-animation.ts)：按 `sourceX/sourceY/sourceWidth/sourceHeight` 裁剪，而不是只按整张图片宽度等分；
- [`src/renderer/pet-animation.test.ts`](../../src/renderer/pet-animation.test.ts)：覆盖网格动作、跨行方向动作和镜像方向；
- 可能还需扩展 [`src/renderer/pet-assets.ts`](../../src/renderer/pet-assets.ts) 的资源描述类型，但图片加载本身不必改变。

这条路径不是“只加角色”的改动，且必须把外部精灵表的行列映射固化到当前项目自己的配置中。

## 当前项目需要改动的文件

以下按推荐的“先切成横向条带”方案列出。这里只是接入清单，本次未修改这些文件。

### 必需改动或新增

| 文件 | 改动 | 原因 |
| --- | --- | --- |
| `素材/<新角色目录>/**` | 新增经确认来源和授权的角色素材；推荐保留原始 `spritesheet.webp` 作为来源存档，并放入实际运行所需的横向条带 | `assetRoot` 运行时需要可访问的图片文件；当前仓库把运行素材放在 `素材/` 下 |
| `src/characters/<新角色>.ts` | 新增一个 `CharacterConfig`，把外部动作名映射为当前框架要求的 `idle`、`walk`、`typing` 等状态，并填写尺寸、锚点、帧数、帧时长 | 角色差异由角色配置表达；[`src/characters/naiwa.ts`](../../src/characters/naiwa.ts) 和 [`src/characters/lulu.ts`](../../src/characters/lulu.ts) 是现有范例 |
| `src/main/index.ts` | 导入新角色并加入 `new CharacterRegistry([ ... ])` | 当前注册表是显式数组，不会自动扫描目录；设置页角色列表来自该注册表 |
| `package.json` | 在 `build.files` 中加入新角色资源目录，例如 `素材/<新角色目录>/**/*` | 目前只显式打包 `素材/奶蛙/processed/**/*` 和 `素材/噜噜/**/*`；不加入清单时开发目录可运行，但打包产物可能缺资源 |

### 按功能选择的改动

| 文件 | 是否必需 | 说明 |
| --- | --- | --- |
| `src/characters/personas/<新角色>.md` | 使用聊天功能时需要 | `CharacterConfig.persona` 是可选字段，但 [`src/ai/chat-service.ts`](../../src/ai/chat-service.ts) 在发送消息时没有人设会直接报“角色未配置人设”；同时需要在新配置中提供 `chatUi` 和 `persona.file` |
| `src/characters/<新角色>.test.ts` | 推荐 | 验证角色动作、帧数、资源名和交互映射，模式可参考 [`src/characters/naiwa.test.ts`](../../src/characters/naiwa.test.ts) |
| `src/characters/index.test.ts` | 注册角色后需要更新 | 当前测试把注册表固定为奶蛙和噜噜，并断言角色摘要列表；新增注册角色后，相关期望值需要同步 |
| `src/shared/types.ts`、`src/renderer/pet-animation.ts`、`src/renderer/pet-animation.test.ts` | 仅直接使用原始多行 WebP 时需要 | 采用预切出的横向条带时不需要改；采用网格动作描述时才需要扩展 |

### 不需要为新增角色修改的文件

只要新角色满足现有 `CharacterConfig` 约束、动作名映射正确，以下通用模块不需要加入角色名判断或专门分支：

- [`src/characters/index.ts`](../../src/characters/index.ts)：已有通用注册、动作存在性和锚点校验；
- [`src/pet/motion.ts`](../../src/pet/motion.ts)：点击、拖拽、召唤、键盘活动、提醒和窗口停靠均通过配置动作名工作；
- [`src/main/pet-runtime.ts`](../../src/main/pet-runtime.ts)、[`src/main/pet-window.ts`](../../src/main/pet-window.ts)、[`src/main/pet-window-create.ts`](../../src/main/pet-window-create.ts)：窗口尺寸、缩放、位置和运行时切换使用 `CharacterConfig`，不依赖具体角色；
- [`src/renderer/pet-assets.ts`](../../src/renderer/pet-assets.ts)：在使用普通横向条带时，现有路径加载逻辑足够；
- `src/preload/**`、`src/shared/channels.ts`、`src/main/ipc.ts`、设置窗口和聊天窗口：角色列表、快照和设置均已经是数据驱动的；
- 现有 `src/characters/naiwa.ts`、`src/characters/lulu.ts`：不需要为了新增角色重写；
- [`src/renderer/index.ts`](../../src/renderer/index.ts) 和 [`src/renderer/styles.css`](../../src/renderer/styles.css)：Canvas 尺寸和缩放由快照中的角色尺寸驱动，不需要增加“大奶蛙”分支。

## 待实现前必须确认的事项

1. **角色 ID**：外部 `pet.json` 使用 `nailong`，目录名是 `naifrog`，当前项目已有 `naiwa`。建议新角色使用一个不冲突的内部 ID（例如 `dainaiwa`），不要把外部字段直接当作当前项目 ID，最终命名需在实现时确定。
2. **第 1 行 idle 的第 7 个 cell**：README 写 6 帧，但图像网格中有 7 个非空 cell，应向资源作者确认或只按 6 帧使用。
3. **播放速度**：外部仓库没有在 `pet.json` 或 README 给出毫秒级帧时长；当前项目的 `frameDurationMs` 必须由接入者选择并通过视觉测试调整。
4. **通用动作覆盖**：当前框架会产生 `typing` 和 `walk` 状态；提醒、拖拽、爬边、窗口停靠是否要有专用动作，需要从外部动作复用、补图或接受回退到 `idle`。
5. **16 方向顺序**：外部资源确实有 16 个注视方向，但没有文本方向索引表。切成两张 8 帧条带后，需要确认它们与当前 [`directionFrame()`](../../src/renderer/pet-animation.ts) 的 `up → right → down` 及镜像规则一致。
6. **授权记录**：确认实际复制的精灵表属于外部仓库 MIT 覆盖的原创内容，还是 Credits 中的第三方素材；发行时保留适用的版权、许可证和来源说明。

## 主要来源

- 外部仓库主页与 README：[GitHub `timerring/codex-pet-naiwa`](https://github.com/timerring/codex-pet-naiwa)
- 外部 README：[中文 `README.md`](https://github.com/timerring/codex-pet-naiwa/blob/3c0cd7ca231f02e0d4d6956fc6ce86eb9f0cfb50/README.md)
- 外部元数据：[ `naifrog/pet.json` ](https://github.com/timerring/codex-pet-naiwa/blob/3c0cd7ca231f02e0d4d6956fc6ce86eb9f0cfb50/naifrog/pet.json)
- 外部桌面精灵表：[ `naifrog/spritesheet.webp` ](https://github.com/timerring/codex-pet-naiwa/blob/3c0cd7ca231f02e0d4d6956fc6ce86eb9f0cfb50/naifrog/spritesheet.webp)
- 外部许可证：[ `LICENSE` ](https://github.com/timerring/codex-pet-naiwa/blob/3c0cd7ca231f02e0d4d6956fc6ce86eb9f0cfb50/LICENSE)
- 当前项目角色入口：[ `src/characters/index.ts` ](../../src/characters/index.ts)、[ `src/main/index.ts` ](../../src/main/index.ts)、[ `src/shared/types.ts` ](../../src/shared/types.ts)、[ `src/renderer/pet-animation.ts` ](../../src/renderer/pet-animation.ts)、[ `package.json` ](../../package.json)
