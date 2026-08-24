# AGENTS.md

本文件是当前项目级执行说明。任何文件与本文件冲突，以本文件和用户最新指令为准。



## 原则

- 默认使用中文编写文档、注释、print、日志和调试说明。
- 先读现有代码、文档和运行入口，再做判断；不凭印象改核心逻辑。
- 简单优先：优先小范围、可解释、可回归的改动，不用大抽象覆盖局部问题。



## 记忆维护

- 需要维护 `memory.md`，但只记录稳定、可复用、跨轮次仍有价值的信息。
- 临时实验路径、未验证结论、需要用户拍板的方案，不写入长期 memory。
- 同一主题优先合并更新，避免重复记忆。



## Skills

处理工程任务时，先检查现有 Skill 是否适用。已有 Skill 能覆盖的问题，不要自行发明另一套重复流程。

以下规则中的名称使用 Skill 的中文显示名；实际加载 Skill 时，以已安装 Skill 的 canonical name 为准。

### 触发规则

- 任何涉及**写代码、修改代码、规划接下来如何修改代码**的任务，都必须使用 `极简编码`。
- 报错、行为异常、性能退化、根因不明确或明确要求 debug / diagnose 时，使用 `故障诊断`。
- 新功能、适合测试先行的修复，或明确要求 TDD / red-green-refactor 时，在 `极简编码` 基础上结合 `测试驱动`。
- review diff / commit / branch / PR，或检查已有代码改动时，使用 `代码审查`。
- 讨论或设计模块边界、interface、seam、adapter、可测试性、模块深度或维护局部性时，使用 `深模块设计`。
- 检查代码库整体架构、寻找架构摩擦、重构机会或深模块化候选时，使用 `架构调优`；需要时结合 `深模块设计`。
- 创建或修改 Skill、`AGENTS.md`、`CLAUDE.md` 等 Agent 指令文档时，使用 `Agent文档`。
- 处理 Git merge / rebase 冲突时，使用 `冲突解决`。
- 查询外部资料、核实文档/API、调查技术方案或整理研究结果时，使用 `资料调研`。
- 讨论项目领域概念、统一术语、维护领域模型、`CONTEXT.md` 或 ADR 时，使用 `领域建模`。


多个 Skill 可以同时使用，不需要为了只选择一个 Skill 而放弃其他明显适用的 Skill。

### Skill 使用回执

如果本轮实际使用了一个或多个 Skill，在最终回复末尾单独注明：

`Skills: <中文 Skill 名>, <中文 Skill 名>`

例如：

`Skills: 故障诊断, 极简编码`

这里始终使用中文显示名，不输出内部 canonical name。

如果本轮没有实际使用任何 Skill，则不要输出 `Skills:`。


<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **HTN-RL-Learner** (11536 symbols, 23813 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "master"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/HTN-RL-Learner/context` | Codebase overview, check index freshness |
| `gitnexus://repo/HTN-RL-Learner/clusters` | All functional areas |
| `gitnexus://repo/HTN-RL-Learner/processes` | All execution flows |
| `gitnexus://repo/HTN-RL-Learner/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
