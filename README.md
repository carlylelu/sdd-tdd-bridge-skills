# sdd-tdd-bridge

当前版本：**2.1.1**。版本变更及升级步骤见 [CHANGELOG.md](CHANGELOG.md)。

OpenSpec 与 Superpowers 的衔接插件：六阶段 Skill、主 Agent、本地 Git 检查和最终证据校验。保留规范驱动开发与 TDD 的分工，使用可追踪的 Task—场景—验证映射衔接二者。

## 能力与边界

| 能力 | 实现 |
|---|---|
| 规范上下文 | 主规范应用 ADDED / MODIFIED / REMOVED / RENAMED delta，形成有效规范 |
| 计划交接 | 每个任务映射到需求、场景、实现文件和验证命令 |
| 任务审查 | 只检查当前任务关联场景、共享约束和回归，独立保存报告 |
| 最终验收 | 全量场景、跨任务集成、OpenSpec verify、代码质量及项目验证 |
| 提交检查 | 检查 Git index 中的规范内容和 Change-Id 关联 |
| 归档前检查 | ready 核对任务完成、逐任务报告、命令结果和工作区摘要 |

格式检查不能证明需求语义或排除范围合规；这些仍需 Agent/人工审查。本地 Hook 可被 Git 配置或外部入口绕过，ready 也不能拦截用户从其他工具直接归档。此包不宣称拥有宿主级强制执行能力。

## 依赖

- Node.js 20+、Git；不需要额外 npm 运行时依赖。
- Git Hooks 需要 POSIX sh（Windows 使用 Git for Windows 自带环境）。直接调用 Node CLI 不需要 Bash。
- 宿主已安装 OpenSpec 与 Superpowers，且可发现六个 bridge Skill。宿主命令及命名空间以实际环境为准。
- 可从原始想法开始，由原生 explore/propose 形成产物；已有完整 proposal.md、design.md、tasks.md 和 specs/ 时直接进入下游，无需重复上游工序。

## 首次配置 OpenSpec（避免缺少原生 Skill）

安装 Bridge 不会替目标项目执行 OpenSpec 初始化。CLI 已安装但找不到 `openspec-propose` 时，通常需要为当前宿主生成项目 Skills。

仅当 CLI 缺失或过旧时安装/升级（OpenSpec 目前要求 Node.js >=20.19.0）：

```sh
node --version
npm install -g @fission-ai/openspec@latest
openspec --version
```

已有可用 CLI 则跳过安装。在**目标项目根目录**，根据宿主选择一条：

```sh
openspec init --tools codex --profile core
# Claude Code：openspec init --tools claude --profile core
# OpenCode：openspec init --tools opencode --profile core
# Cursor：openspec init --tools cursor --profile core
# Gemini CLI：openspec init --tools gemini --profile core
```

不确定宿主 ID 时运行交互式 `openspec init` 选择工具，不猜 ID。已初始化且仅指令过旧时运行 `openspec update`；CLI 过旧先升级。未选当前宿主或缺少 core 工序时，仍使用上面的 init 命令补齐。保留原规范与草稿，不使用 `--force` 覆盖冲突。

完成后按宿主方式重载项目或开启新会话，确认发现 `openspec-explore`、`openspec-propose`，再说“继续刚才的 Bridge 流程”。当前官方 Codex 生成路径为 `.agents/skills/openspec-*/SKILL.md`，旧版以实际输出为准；生成文件不等于当前会话已加载。安装/初始化尚未成功时，Bridge 保持 BLOCKED 并说明具体恢复步骤。

指引核对于 2026-10-21，来源：[官方安装说明](https://github.com/Fission-AI/OpenSpec/blob/main/docs/installation.md)、[CLI](https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md)、[支持的宿主](https://github.com/Fission-AI/OpenSpec/blob/main/docs/supported-tools.md)。

## 安装：宿主能力与仓库检查分别启用

### Claude Code

```text
/plugin marketplace add carlylelu/sdd-tdd-bridge-skills
/plugin install sdd-tdd-bridge@sdd-tdd-bridge
```

该入口注册随包的 Skill 和 Agent；安装后仍须执行下方仓库检查安装。具体 Skill 名称可能带插件命名空间，主 Agent 应先发现实际入口。

### OpenCode

在 opencode.json 中只选择一个插件来源，避免同时加载本地副本和 npm 副本。已安装 npm 包时配置 `"plugin": ["sdd-tdd-bridge"]`；本地开发可直接在此仓库启动 OpenCode，让它加载 `.opencode/plugins/sdd-tdd-bridge.js`。单独复制此 JS 文件会破坏其包内相对路径，不能作为完整安装。

插件 config hook 注册 skills 路径和 bridge_agent（primary），同时保留用户已配置的同名 Agent 字段。不自动修改项目 Git 配置。

配置依据：[OpenCode plugins](https://opencode.ai/docs/plugins/) 和 [Agent 配置](https://opencode.ai/docs/agents/)。CodeFree 可读取 `.codefree-plugin/plugin.json`，但本次未在该宿主执行集成验证。

### 其他支持 Skill 的宿主（包括 Codex）

将 `skills/` 下的六个 Skill 目录完整复制到该宿主配置的技能目录；必须保留 `bridge-load-context-skill/references/workflow.md`。`agents/bridge_agent.md` 是编排说明，是否可自动注册由宿主决定；不能仅复制文件就宣称原生 Agent 已启用。可由当前会话按该编排说明调用六个 Skill。

### 为目标仓库启用检查

在插件源码目录运行，`/path/to/project` 替换为目标仓库根目录（支持带空格路径和 Git worktree）：

```sh
node checks/bridge.mjs install --repo "/path/to/project"
node checks/bridge.mjs doctor --repo "/path/to/project"
```

PowerShell 运行同一 Node 命令，使用 Windows 绝对路径即可。

install 将运行时复制到目标 `bridge/checks/`，生成可执行 `.bridge-hooks/`，仅修改目标仓库的 core.hooksPath。保留原有 Hook：pre-commit / commit-msg 先运行旧 Hook，再检查最终输入；pre-push、prepare-commit-msg 等其他 Hook 使用委托保持原行为。Git 负责展开原 hooksPath 中的用户目录。既有目标文件与插件冲突时拒绝覆盖；与当前包内容完全相同的运行时可复用。无自动全局设置或网络安装。运行时/Hook 缺失会失败，不返回虚假 PASS。

存在多个 worktree 时，须事先在仓库启用 `git config extensions.worktreeConfig true`，install 才会使用 `--worktree` 独立配置。未启用时拒绝安装，不修改共享 hooksPath。单工作区未启用该扩展时使用 `--local`；之后增加 worktree 应先卸载、启用独立配置，再按需逐工作区安装。安装器不会擅自启用仓库扩展。

doctor 核对运行时内容摘要、Hook 内容、权限、安装记录 schema、配置和原 Hook 是否仍在。验证 Hook 会独立检查已安装运行时摘要，再调用 CLI；损坏或清空的检查器不能无声通过。托管目录和文件存在 symlink/junction 时会在修改前拒绝操作，避免沿链接写到仓库外。宿主 Skill、Agent、OpenSpec、Superpowers 状态明确返回 NOT_CHECKED，需在宿主会话确认。doctor PASS 只表示仓库侧安装正常。

卸载恢复原本地 hooksPath（原本没有则恢复继承默认/全局设置），保留检查器和报告，不删除用户文件：

```sh
node checks/bridge.mjs uninstall --repo "/path/to/project"
```

安装状态 `bridge/install-state.json` 包含机器本地路径，和 `.bridge-hooks/` 一起保持本地，不提交。新克隆应重新 install。不要手工覆盖现有 core.hooksPath。

## 六阶段

完整规则以 [共享流程契约](skills/bridge-load-context-skill/references/workflow.md) 为准，主 Agent 不再重复维护另一份规则。

| 阶段 | Skill | 输出 |
|---|---|---|
| EXPLORE | bridge-explore-skill | 原生探索交接；命名后可选 explore-report.json |
| PROPOSAL | bridge-proposal-skill | 原生方案产物；可选 proposal-report.json |
| LOAD_CONTEXT | bridge-load-context-skill | context-report.json：有效规范、源摘要、结构校验 |
| PLANNING | bridge-planning-skill | planning-report.json：Task—场景—验证映射 |
| IMPLEMENT_TASK | bridge-spec-compliance-check-skill | tasks/<task-id>.json：当前任务证据 |
| DUAL_VERIFY | bridge-dual-verify-skill | verify-report.json：全量验证 |

所有报告位于 `bridge/reports/<change>/`。旧 compliance-report.md 的单文件 PASS 不能替代逐任务证据；旧 Markdown 报告需重新核对并迁移到 JSON，不能直接更名充当新证据。

用户授权端到端执行后可以连续推进，不要求逐阶段人工触发。普通实现/测试失败交回实现者修复；审查和验证 Skill 保持只读。需求、架构或排除范围发生变化才请求上游决策。相同原因两次修复仍失败则停止该路径并报告，不无限重试。

测试按风险选择，每场景至少有可验证证据；不要求每场景机械生成两个测试。文档/配置任务使用相应验证方式；行为实现采用 TDD。计划中的提交步骤不自动授予提交权限。

## CLI 与格式约定

目标项目中：

```sh
node bridge/checks/bridge.mjs format --repo . --change add-login
node bridge/checks/bridge.mjs format --repo . --staged
node bridge/checks/bridge.mjs commit --repo . --message-file .git/COMMIT_EDITMSG
node bridge/checks/bridge.mjs fingerprint --repo .
node bridge/checks/bridge.mjs ready --repo . --change add-login
```

兼容旧 `checks/openspec-format-check` 和 `checks/commit-msg-check` Bash 入口，它们转发同一 Node 实现；复制检查器时必须复制整个 checks/，不能只复制两个 wrapper。

约定：

- 变更名采用小写字母/数字及连字符；拒绝路径穿越。
- proposal 使用 Scope / What Changes / 范围 等标题，另含 Out-of-Scope / 排除范围；design 使用 Design / Decisions / 技术方案 等标题。
- tasks 使用 `- [ ] 1.1 实现登录`，ID 必须唯一稳定，完成后改为 `[x]`。
- delta 场景采用 `#### Scenario: 名称`（或中文场景），每个新增/修改需求各自包含场景，每个场景必须有非空 WHEN、THEN；GIVEN 可选。支持大小写、粗体和中英文关键词。纯 REMOVED delta 不强制新增场景；RENAMED 使用有序且非空的 FROM/TO 对，不强制新场景。声明的操作章节不能为空；删除和重命名意图仍需语义审查。
- 代码围栏不参与标题、任务或场景解析。独立 TODO/TBD/待补充 标记视为未完成；普通泛型、HTML 和讨论 TODO 解析器的文字不会被笼统阻断。
- `--staged` 读取 Git index 内容；未暂存修复不影响即将提交的快照。整个变更归档/删除允许通过结构检查，部分删除仍按剩余内容检查。archive 目录不作为活跃变更。

提交格式：

```text
feat(auth): implement login

Change-Id: add-login
```

有活跃变更时，纯实现提交也必须有唯一 Change-Id，且位于最后的 trailer 块；修改不同变更的规范须拆开提交。无活跃变更、未触及规范的常规提交不要求 Change-Id。归档和整项删除提交仍可关联原变更名。

## 报告新鲜度与归档

[任务模板](templates/task-report.json) 和 [最终模板](templates/verify-report.json) 默认 BLOCKED。公共字段、任务映射和失败路由见共享契约。schema_version 为 1，包含实际时间、真实证据和 fingerprint。

fingerprint 覆盖 Git 跟踪文件及未忽略的新文件、删除、链接目标和执行权限；逐文件计算字节摘要，再对带类型和文件名的 JSON 记录计算总摘要，避免二进制内容与记录边界混淆。包含 context/planning 报告，排除其他报告和安装状态，避免最终报告使自身失效。被 Git 忽略的文件/外部服务需额外记录环境与验证证据；子模块需要单独验证，不能被无声忽略。此次摘要算法变更后旧 PASS 必须重新验证。

先完成 tasks.md 的进度更新，再在最终工作区实际复查每个任务，更新逐任务报告；不能只换摘要和时间。最终全部 Task 报告及 verify 报告须匹配同一最终摘要。代码、规范或任务清单变化后旧 PASS 失效。此版本采取保守的全工作区失效策略，避免漏掉共享依赖影响。

ready 不执行测试，也不证明填写的证据为真；它拒绝缺失、失败、过期或任务覆盖不一致的报告。主 Agent 还必须核对实际 OpenSpec verify、代码审查、全量测试以及零测试/跳过用例的验收依据。只有两者都通过才能调用宿主归档入口；检查后输入再次变化需重验。

## 开发验证

```sh
npm test
npm pack --dry-run
```

测试使用临时 Git 仓库，覆盖 index/worktree 分离、归档、worktree、场景结构、提交关联、Hook 串接、安装卸载、摘要失效和最终证据闸门。OpenCode config hook 采用直接调用测试；各宿主真实会话、Linux/macOS 环境仍需相应环境的集成验证。

## 包结构

- agents/：主 Agent 编排说明。
- skills/：六阶段及共享流程契约。
- checks/lib.mjs：Git 快照、格式和提交检查。
- checks/evidence.mjs：摘要和最终证据校验。
- checks/install.mjs：仓库安装、诊断及卸载。
- checks/bridge.mjs：跨平台 CLI。
- hooks/：直接调用 Node 的 Hook 模板。
- templates/：默认阻塞的报告模板。
- tests/：真实 Git 仓库回归测试。

[MIT License](LICENSE)

## 原生上游代理与恢复

主 Agent 现在覆盖 EXPLORE → PROPOSAL → LOAD_CONTEXT → PLANNING → IMPLEMENT_TASK → DUAL_VERIFY → ARCHIVE。前两阶段通过宿主实际提供的 OpenSpec 原生能力执行，单阶段请求在该阶段结束；完整已有产物直接进入下游。探索默认只读，原生能力缺失会 BLOCKED。

```sh
node bridge/checks/bridge.mjs route --repo .
node bridge/checks/bridge.mjs route --repo . --change my-change --intent explore
node bridge/checks/bridge.mjs route --repo . --change my-change --intent propose
node bridge/checks/bridge.mjs spec-fingerprint --repo . --change my-change
```

安装前可使用本插件 checks/bridge.mjs 的绝对路径运行只读命令。route 输出仅为建议，需结合语义审查；多变更需选择，缺失或格式错误的产物回到方案阶段。宿主原生命令不能作为 shell 命令执行。

升级后重新运行安装流程以刷新 runtime（新增 context、workflow、reports 模块），再运行 doctor。旧 context/planning 报告缺少 spec_fingerprint 时重新生成；不必补做探索和方案报告。规范摘要覆盖变更、主规范、配置与护栏，忽略任务勾选进度和换行差异；最终工作区摘要仍检查代码与任务进度。上游变更保留历史报告，但 ready 拒绝过期报告。

代理语义依据 [OpenSpec explore](https://github.com/Fission-AI/OpenSpec/blob/main/docs/explore.md) 和 [原生 Skills](https://github.com/Fission-AI/OpenSpec/blob/main/docs-lab/reference/skills.md)，具体可用入口以宿主发现结果为准。

最终工作区摘要包含 context-report.json 和 planning-report.json，绑定有效规范解释和计划内容；其他阶段报告仍排除以避免写报告使自身失效。生成或修改上下文/计划后，重新获取工作区摘要并真实重审下游证据。
