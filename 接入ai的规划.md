这是一个分阶段的任务，实现的功能是接入ai对话。

重点结合当前真实代码结构进行实现，不要脱离现有架构另起一套系统。

目前项目已经有较明确的 Electron 分层：

* `src/main/`
* `src/preload/`
* `src/renderer/`
* `src/shared/`
* `src/characters/`
* `src/pet/`

并且已经有：

* 桌宠主窗口
* 设置窗口
* 工具箱
* 备忘录独立窗口
* IPC
* `settings.json`
* `todos.json`
* 角色配置 `CharacterConfig`
* 奶蛙动作系统
* `typing` 动作
* Electron Builder 打包配置

请先阅读相关代码，尤其关注：

* `src/main/index.ts`
* `src/main/settings.ts`
* `src/main/settings-window.ts`
* `src/main/memo-window.ts`
* `src/main/memo-ipc.ts`
* `src/preload/`
* `src/renderer/settings.*`
* `src/renderer/memo.*`
* `src/shared/types.ts`
* `src/shared/channels.ts`
* `src/characters/index.ts`
* `src/characters/naiwa.ts`
* `package.json`

## 目标

新增一个 AI 聊天功能。

用户可以：

1. 在设置中填写自己的 AI API 信息：

   * API Base URL
   * API Key
   * Model
2. 通过右键菜单：

   * `工具箱`

     * `聊天`
     * `备忘录`
3. 打开独立聊天窗口。
4. 与当前桌宠对应的 AI 角色聊天。
5. AI 必须读取项目内为桌宠编写的 Markdown 人设文件，并尽量持续遵守该人设。
6. 支持多轮聊天。
7. 支持流式输出。
8. 支持停止当前生成。
9. 支持清空当前聊天记录。

第一版只实现 OpenAI-compatible API，不需要一次支持 OpenAI / Claude / Gemini 等多套 SDK。

但是结构上需要保留 Provider 抽象，方便以后增加其他模型。

---

# 一、核心架构原则

请严格保持下面几个边界。

## 1. 角色和 AI 模型必须解耦

角色只负责：

* 名字
* 动作
* 素材
* 人设

角色不应该知道：

* API Key
* Base URL
* OpenAI
* Claude
* Gemini
* HTTP 请求实现

即：

```text
Character
    ↓
persona.md

ChatService
    ↓
AiProvider
    ↓
OpenAI-compatible API
```

不要把 AI 请求逻辑写进：

* `naiwa.ts`
* `pet-runtime.ts`
* `motion.ts`
* renderer

---

## 2. AI 请求只能由 Main Process 发出

保持现有 Electron 安全边界：

```text
renderer
    ↓
preload
    ↓
IPC
    ↓
main
    ↓
AI Provider
    ↓
外部 API
```

不要让：

```text
src/renderer/chat.ts
```

直接：

```ts
fetch(...)
```

AI API。

Renderer 不应该直接获得 API Key。

---

## 3. API Key 不属于普通 AppSettings

当前 `AppSettings` 主要保存：

* characterId
* petScale
* theme
* shortcut
* position

不要直接增加：

```ts
apiKey: string
```

然后让它明文进入 `settings.json`。

AI 普通配置和密钥需要分开。

例如：

```text
普通配置：
ai-config.json

provider
baseUrl
model
```

敏感信息：

```text
apiKey
```

使用 Electron `safeStorage` 加密后保存在 `app.getPath("userData")` 中。

要求：

* renderer 可以知道 `hasApiKey: true/false`
* renderer 不得读取已经保存的完整 API Key
* IPC snapshot 中不能出现完整 API Key
* 日志中不能输出 API Key
* 错误信息中避免输出 Authorization header

Linux 下如果 `safeStorage` 使用低安全级别 fallback，可以记录诊断信息，但不要因此阻止程序运行。

---

# 二、角色 Markdown 人设

不要把长篇人格 Prompt 写进 `naiwa.ts`。

建议新增：

```text
src/characters/personas/
    naiwa.md
```

并给 `CharacterConfig` 增加非常轻量的引用，例如：

```ts
persona?: {
  file: string;
}
```

奶蛙：

```ts
persona: {
  file: "naiwa.md"
}
```

具体字段名称可以根据现有代码风格调整，但不要过度设计。

`naiwa.md` 第一版可以先写一个简单可替换的人设，例如：

```markdown
# 身份

你是奶蛙，是生活在用户桌面上的桌宠。

# 性格

你活泼、呆萌，有一点调皮，但不会故意装傻。

你关心用户正在做的事情，也愿意陪用户聊天。

# 说话方式

- 回复通常简短自然
- 使用口语
- 不要像客服
- 不要频繁强调自己是 AI
- 可以偶尔表现奶蛙自己的性格
- 不要每句话都刻意卖萌

# 行为规则

始终尽量保持奶蛙的人格和说话方式。

即使用户讨论代码、学习、生活等内容，也应该保持角色风格，但不要因为角色扮演而降低回答信息的正确性。
```

Persona Loader 直接读取 Markdown 全文即可。

第一版不需要解析 Markdown AST。

---

# 三、建议模块划分

根据当前项目规模，建议增加：

```text
src/ai/
    ai-provider.ts
    openai-compatible-provider.ts
    ai-config.ts
    ai-credential-store.ts
    persona-loader.ts
    chat-service.ts
```

Main：

```text
src/main/
    chat-window.ts
    chat-ipc.ts
```

Preload：

```text
src/preload/chat.ts
```

Renderer：

```text
src/renderer/chat.html
src/renderer/chat.ts
src/renderer/chat.css
```

角色：

```text
src/characters/personas/naiwa.md
```

不要求文件名必须完全一致。

如果当前代码结构中存在更自然的放置方式，可以调整，但请解释理由。

不要创建复杂 framework。

---

# 四、AiProvider

定义一个非常小的 Provider 抽象。

目标是让 ChatService 不知道具体供应商。

例如概念上：

```ts
interface AiProvider {
  chat(request: ChatRequest): AsyncIterable<string>;
}
```

或者其他适合 TypeScript / 当前 IPC 架构的形式。

第一版实现：

```text
OpenAICompatibleProvider
```

配置：

```text
baseUrl
apiKey
model
```

需要支持：

* `system`
* `user`
* `assistant`
* 流式响应
* AbortSignal

不要把 Provider 和角色绑定。

---

# 五、Prompt / Persona 拼接

核心逻辑放在：

```text
ChatService
```

每次请求时重新加入当前角色的人设。

概念：

```text
SYSTEM

你正在扮演桌宠“奶蛙”。

以下是角色人格设定：

--- persona ---

<naiwa.md 全文>

--- end persona ---

请尽量保持角色的人格、语气和行为设定。
```

之后再附上：

```text
历史 user / assistant messages
+
当前 user message
```

不要只在第一次对话发送 Persona。

每次调用模型都应让 Persona 作为高优先级上下文存在。

---

# 六、聊天 Session

第一版不要上数据库、向量数据库或 RAG。

只需要简单的：

```ts
ChatMessage {
  id
  role
  content
  createdAt
}
```

以及：

```text
当前 characterId
messages
generating
```

为了避免无限增长，可以只向模型发送最近一定数量消息。

例如：

```text
最近 20～30 条
```

具体数字可以集中为常量。

聊天历史第一版可以：

A. 仅当前应用生命周期内存在

或者

B. 简单保存在 userData JSON

如果当前架构实现 B 很简单，可以持久化。

但不要为了聊天历史专门引入数据库。

---

# 七、IPC

继续沿用当前：

```text
pet:
settings:
memo:
reminder-overlay:
```

这种 channel namespace 风格。

建议新增类似：

```ts
chatChannels = {
  getState: "chat:get-state",
  send: "chat:send",
  delta: "chat:delta",
  done: "chat:done",
  error: "chat:error",
  clear: "chat:clear",
  cancel: "chat:cancel",
}
```

AI 设置可以单独：

```ts
aiSettingsChannels = {
  get: "ai-settings:get",
  update: "ai-settings:update",
  saveApiKey: "ai-settings:save-api-key",
  removeApiKey: "ai-settings:remove-api-key",
  test: "ai-settings:test",
}
```

具体名字可以根据现有风格微调。

要求职责清晰：

```text
AI settings
≠
Chat
```

---

# 八、Chat Window

参考当前备忘录：

```text
memo-window.ts
memo preload
memo.html
memo.ts
memo.css
```

新增 Chat Window。

窗口行为保持一致：

```text
已经打开
→ focus

未打开
→ BrowserWindow
→ preload/chat.js
→ chat.html

关闭
→ 清除引用
```

保持：

```ts
contextIsolation: true
nodeIntegration: false
```

不要为了 AI 功能破坏现有 Electron 安全配置。

---

# 九、右键菜单

当前：

```text
工具箱
└── 备忘录

设置
退出
```

改成：

```text
工具箱
├── 聊天
└── 备忘录

设置
退出
```

“聊天”调用：

```text
showChatWindow
```

不要把 Chat Window 直接写进 `index.ts`。

---

# 十、设置 UI

当前 Settings 是独立窗口。

希望增加一个简单的 AI 配置区域。

如果现有页面适合，建议变成：

```text
桌宠设置 | AI
```

两个 Tab。

AI 页面：

```text
接口类型
OpenAI Compatible

Base URL
[                       ]

Model
[                       ]

API Key
[••••••••••••••••       ]

[测试连接]

连接状态：未配置 / 可用 / 连接失败

[保存]
```

要求：

* 已保存 Key 时，只显示“已配置”
* 不重新读取完整 Key
* 如果用户没有修改 Key，则保存普通设置时不要覆盖原 Key
* 可以删除 Key
* 可以重新输入覆盖

第一版只需要一个：

```text
OpenAI Compatible
```

不用真的做 Provider 下拉多选。

---

# 十一、测试连接

设置页面需要：

```text
测试连接
```

测试目标：

验证：

```text
baseUrl
apiKey
model
```

能否成功请求模型。

测试连接必须经过：

```text
renderer
→ preload
→ IPC
→ main
→ Provider
```

不要 renderer 自己测试。

失败时返回适合用户阅读的错误。

例如：

```text
401：API Key 无效
404：Base URL 或接口路径错误
模型不存在
网络连接失败
```

不要泄露完整 API Key。

---

# 十二、流式聊天

第一版希望直接支持流式输出。

行为：

```text
用户点击发送

立即出现 user message

assistant 创建空消息

模型开始返回

"你"
↓
"你好"
↓
"你好呀"
```

逐步更新当前 Assistant Bubble。

Main Process 可以：

```text
webContents.send(chatChannels.delta, ...)
```

Renderer 累积显示。

生成完成：

```text
chat:done
```

错误：

```text
chat:error
```

---

# 十三、Abort / 停止生成

ChatService / Provider 需要支持：

```text
AbortController
```

场景：

```text
用户点击停止生成
```

或者：

```text
聊天窗口关闭
```

都应该：

```text
abort 当前请求
```

避免关闭窗口后请求继续跑。

不要让多个生成请求无限并发。

第一版可以限制：

```text
一个 Chat Session 同时最多一个 generation
```

---

# 十四、聊天 UI

先保持简单，不要花大量时间做复杂 UI。

基本结构：

```text
┌──────────────────────────────┐
│ 奶蛙                    清空 │
├──────────────────────────────┤
│                              │
│ user bubble                  │
│                 assistant    │
│                              │
│                              │
├──────────────────────────────┤
│ 输入消息……             发送 │
└──────────────────────────────┘
```

需要：

* Enter 发送
* Shift + Enter 换行
* 自动滚到底部
* generating 时显示停止按钮
* 错误信息可见
* 空输入不可发送
* 请求失败不要丢失用户消息

聊天样式同时适配项目当前：

```text
light
dark
```

主题。

---

# 十五、暂时不要接奶蛙 typing 动作

虽然当前：

```text
naiwa.ts
```

已经有：

```text
typing
```

动作，而且项目已经有 keyboard activity。

但是本轮请先不要让 ChatService 直接控制 PetRuntime。

先完成：

```text
AI 配置
Persona
Provider
ChatService
Chat Window
Streaming
```

后续再单独通过 Chat Event → Pet Runtime 的方式触发 typing。

避免聊天业务和宠物动画耦合。

---

# 十六、Electron Builder

这是必须检查的一点。

当前 `package.json` 的 `electron-builder.files` 主要包含：

```text
dist/**/*
src/renderer/**/*
素材/奶蛙/processed/**/*
```

新增：

```text
src/characters/personas/*.md
```

以后必须能够进入安装包。

请检查打包后的路径解析。

Persona Loader 不应该只在：

```text
npm start
```

环境能工作，而打包成：

```text
exe
dmg
AppImage
```

之后找不到 Markdown。

请设计统一的资源路径解析。

---

# 十七、测试要求

保持当前项目已有测试风格。

至少增加针对以下核心逻辑的测试：

### Persona

* 能找到当前角色 persona
* 文件不存在时行为明确

### AI Config

* 非法配置 normalize
* baseUrl / model 校验
* snapshot 不包含 API Key

### Credential Store

尽量把 Electron `safeStorage` 包装成可注入依赖，以便测试。

验证：

```text
save
has
read
delete
```

不要在单元测试中真的依赖系统 keychain。

### Chat Service

使用 Fake Provider：

```text
user message
+
persona
+
history
```

能正确构造请求。

测试：

```text
stream
abort
clear
provider error
```

### IPC

确保：

```text
renderer 无法通过任何公开 IPC 获取完整 API Key
```

---

# 十八、错误处理

重点处理：

```text
未配置 API
API Key 不存在
baseUrl 非法
model 为空
网络失败
401
403
404
429
5xx
流中断
用户取消
persona 文件不存在
```

错误信息应适合 UI 展示。

内部日志可以更详细。

但是任何日志都不要包含：

```text
完整 Authorization
完整 API Key
```

---

# 十九、不要做的事情

本轮不要：

* 引入 React / Vue
* 重构整个 Renderer
* 引入数据库
* 引入向量数据库
* 做 RAG
* 做 Agent
* 做 Function Calling
* 做工具调用
* 做联网搜索
* 做长期记忆
* 做语音
* 做多模型路由
* 做复杂 Prompt 模板语言
* 大改 PetRuntime
* 大改 Motion
* 重构现有备忘录
* 为未来功能建立复杂 plugin framework

保持简单。

---

# 二十、实现顺序

请严格分阶段，不要一次大改。

## Phase 1：AI 配置和安全存储

完成：

```text
AiConfig
CredentialStore
safeStorage
shared types
IPC
Settings UI
测试连接
```

验收：

用户可以：

```text
填写 Base URL
填写 Model
填写 API Key
保存
重启应用
配置仍存在
测试连接
```

并确认：

```text
settings.json 没有 API Key
renderer snapshot 没有 API Key
```

---

## Phase 2：Persona + Provider

完成：

```text
AiProvider
OpenAICompatibleProvider
persona-loader
naiwa.md
Character persona reference
builder resource
```

验收：

可以在 Main Process 中完成：

```text
当前角色
→ 加载 persona
→ 调模型
→ 得到回复
```

---

## Phase 3：Chat MVP

完成：

```text
chat-window
chat-ipc
chat preload
chat renderer
右键菜单
历史消息
clear
```

验收：

```text
右键奶蛙
→ 工具箱
→ 聊天
→ 输入消息
→ AI 按奶蛙人设回复
```

---

## Phase 4：Streaming

完成：

```text
流式输出
AbortController
停止生成
窗口关闭取消
错误展示
dark/light theme
```

验收：

聊天回复逐字出现，并且：

```text
停止生成
```

能够立即中断请求。

---

# 二十一、代码设计要求

继续遵守当前仓库已有风格：

* TypeScript
* 小模块
* 明确职责
* IPC contracts 放 shared
* Main 持有系统权限
* Renderer 保持纯 UI
* 能测试的逻辑不要直接绑定 Electron global
* 不做无关重构
* 不复制重复逻辑
* 不为了“未来可扩展”引入复杂抽象

特别注意：

```text
Character
Persona
ChatSession
ChatService
AiProvider
AiCredentialStore
```

职责必须区分清楚。

---

# 二十二、开始前先输出实施方案

在真正修改代码之前，请先：

1. 阅读上述相关文件。
2. 根据真实代码确认哪些建议可以直接复用。
3. 列出预计新增/修改的文件。
4. 说明每个文件职责。
5. 说明数据流。
6. 指出你发现的任何现有架构约束。
7. 给出分阶段实施计划。

不要在没有读代码的情况下直接开始大量创建文件。

方案确认后再按 Phase 顺序实现。

不要自行扩展本需求之外的功能。
