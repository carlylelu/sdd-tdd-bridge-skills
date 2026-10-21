# Bridge 统一流程契约（schema_version: 1）

六个阶段和主 Agent 共用此契约。宿主的系统指令、项目护栏和用户授权优先。此文件不授予提交、推送或发布权限。

## 有效规范

有效规范 = 主规范应用本次 delta 后的结果。LOAD_CONTEXT 必须列出 requirement 的基线位置、delta 位置、操作及最终要求。

- ADDED：添加需求；与已有同名需求冲突时返回 UPSTREAM_CHANGE_REQUIRED。
- MODIFIED：以 delta 中完整的新要求替代旧要求；未修改需求继续有效。
- REMOVED：不再要求实现被删除行为，同时验证其移除不会破坏仍有效的约束。
- RENAMED：明确旧名到新名的映射，保留关联场景的追踪；无法定位旧名则阻塞。
- 同一需求存在互相矛盾的操作、delta 不完整或目标不明确时，不自行猜测。返回 UPSTREAM_CHANGE_REQUIRED，由用户决定上游变更。

例如主规范令牌有效期 30 分钟，MODIFIED 改为 15 分钟，则按 15 分钟验证。其他未修改的鉴权要求仍须遵守。格式检查只验证结构，不能替代此语义判断。

## 授权和阶段状态

用户已授权端到端实现时，可连续执行 EXPLORE → PROPOSAL → LOAD_CONTEXT → PLANNING → IMPLEMENT_TASK（循环）→ DUAL_VERIFY → ARCHIVE；用户只授权单阶段时，到该阶段终点停止。不要求每个阶段重复人工触发。归档仍须在用户授权范围和宿主工具权限内。

统一 result 枚举：PASS、FAILED、BLOCKED、NEEDS_CLARIFICATION、UPSTREAM_CHANGE_REQUIRED。返回必须包含 schema_version、stage、change_id、result、outputs、evidence、issues、next_action。可选 task_id；不存在的测试数量不得编造。

失败路由：

| 问题 | 结果 | 下一步 |
|---|---|---|
| 已授权范围内实现/测试不符合要求 | FAILED | 返回 IMPLEMENT_TASK，由实现者修复后重新审查、重验 |
| 需求、架构、排除范围需调整 | UPSTREAM_CHANGE_REQUIRED | 展示证据，请用户决定上游修改 |
| 缺失宿主 Skill、工具或环境异常 | BLOCKED | 给出缺失项和恢复条件，不伪造结果 |
| 多个变更且用户未指定 | NEEDS_CLARIFICATION | 让用户选定对象 |

普通修复不重复索取已获得的授权。相同原因修复两次仍失败时，停止该修复路径，报告根因和待决策项；不后台轮询、不无限重试。检查、审查、验证 Skill 只读业务代码；修复由主 Agent 返回实现执行者完成。

## 任务、场景和测试映射

tasks.md 使用带稳定 ID 的 checkbox：`- [ ] 1.1 实现登录`。保留现有稳定 ID，禁止为绕过审查删除任务。

planning-report.json 保存：

```json
{
  "task_mapping": [
    {
      "task_id": "1.1",
      "kind": "behavior",
      "requirement_ids": ["auth/Login"],
      "scenario_ids": ["auth/Login/Valid login"],
      "task_assertions": ["签发函数返回可验证的令牌"],
      "deferred_integration": [{"scenario_id": "auth/Login/End-to-end login", "owner_tasks": ["1.1", "1.2"], "final_verification": "端到端登录测试"}],
      "implementation_files": ["src/login.js"],
      "verification": [{"test_ref": "tests/login.test.js#valid-login", "command": "node --test tests/login.test.js"}],
      "steps": ["失败测试", "运行确认业务断言失败", "最小实现", "运行通过", "必要时重构"]
    }
  ]
}
```

requirement/scenario 的 ID 优先使用上游显式 ID，否则使用 capability/requirement/scenario 的唯一组合并记录源文件及标题。重名加明确锚点，不依赖易变行号。FR/AC 仅在项目已有此模型时使用，不作为 OpenSpec 的额外强制文件或字段。

每个场景至少关联一项可验证证据，不机械规定正常+错误两个测试。异常、边界、安全和兼容风险按实际适用性补充。多个场景可共享参数化测试，但断言必须覆盖各自行为。文档/配置/删除类任务可使用构建、静态检查、文档校验或回归测试，说明不采用 TDD 的理由。只对行为实现采用 RED-GREEN-REFACTOR。

提交按可独立审查的变更组织，不强制每个 TDD 步骤或 Task 单独提交，也不因 plan 中包含提交而自动获得提交授权。

## 审查范围与证据

任务审查只覆盖 planning 中当前 task_id 的 task_assertions、可独立完成的场景及共享约束，并检查对已有功能的回归；不因未来任务尚未实现而失败。跨任务场景单独放入 deferred_integration，列出责任任务和最终验证，不把完整集成场景重复加入各任务的独立验收清单。当前片段验收不等于整个集成场景通过；只有 DUAL_VERIFY 可以把 deferred_integration 标记为完成。未知任务关联应回到 PLANNING，不能自行扩大或缩小范围。最终 DUAL_VERIFY 检查全部有效需求、全部场景、全部任务及全部延后集成项，不能静默遗漏。

机器可读报告为 JSON；Markdown 可作为额外的人类阅读摘要，不作为闸门输入。路径：

- bridge/reports/<change>/context-report.json
- bridge/reports/<change>/planning-report.json
- bridge/reports/<change>/tasks/<task-id>.json（每个任务独立，不能覆盖其他任务）
- bridge/reports/<change>/verify-report.json

报告公共字段：schema_version=1、stage、change_id、result、checked_at（实际 UTC ISO 时间，采用 JavaScript toISOString 的 YYYY-MM-DDTHH:mm:ss.sssZ 格式，不得超过当前时间五分钟）、fingerprint、evidence（非空字符串数组）、issues（数组）、outputs（非空字符串数组）、next_action（非空字符串）。PASS 的 issues 必须为空；已解决问题可记录到独立历史字段。Task 还必须包含 scenario_ids、implementation_refs、test_refs 字符串数组，文档或配置等不适用场景的数组可以为空，但须在证据中说明验证方式。模板位于插件 templates/；模板默认 BLOCKED，必须用实际检查结果替换，不能把模板当证据。

运行 `node bridge/checks/bridge.mjs fingerprint --repo .` 获取工作区摘要：覆盖 Git 跟踪文件及未忽略的新文件、删除和执行权限；排除 bridge/reports/ 中的其他报告、.bridge-hooks/、bridge/install-state.json，避免报告写入使自身失效。忽略文件（如构建产物）和外部服务不在摘要中，需另列环境/命令证据；子模块须单独验证。

Task 报告绑定审查时的摘要。最终阶段采用保守策略：全部 task 报告必须在最终工作区重新确认；先更新任务完成标记，再生成摘要，实际复查关联行为、回归和代码审查，不能只替换摘要或时间。任何代码/规范/任务清单变化使旧 PASS 失效。恢复时重算摘要、查看任务清单和证据，不凭聊天记录认定完成。

LOAD_CONTEXT / PLANNING 的输入依赖是规范、护栏和映射；实现期间正常的代码变化不要求重新做需求分析。主 Agent 必须核对上游报告列出的规范源内容是否变化：规范或映射变化则回退相应阶段。最终 ready 对 Task 和验证报告使用全工作区摘要。

## 最终闸门和能力边界

完成全部任务后：执行最终规范审查、宿主 OpenSpec verify、代码质量审查及项目声明的全量验证命令。规范审查与命令验证各自收集证据；一项失败不妨碍运行另一项安全的只读验证，但任何一项失败都不能归档。命令不存在、零测试、跳过用例或覆盖范围不足不能仅凭退出码 0 判 PASS；记录适用的验收理由。

归档前必须执行 `node bridge/checks/bridge.mjs ready --repo . --change <change>`。该命令检查格式、任务完成、逐任务报告、最终覆盖、OpenSpec 结果、命令退出码和摘要新鲜度；它不执行测试、不证明证据真实性、不解释需求语义，也不能拦截从其他入口直接运行的 OpenSpec archive。主 Agent 只能在该命令 PASS 且宿主验证真实完成后调用宿主归档入口。

OpenSpec/Superpowers 的名称空间和命令形式因宿主而异。先确认实际可用的 Skill/命令，禁止把 `/opsx:verify` 当成所有宿主都支持的 shell 命令。缺失则 BLOCKED。归档目录由宿主确定；本地检查支持 openspec/changes/archive/ 和 openspec/archive/，并从活跃变更发现中排除 archive。格式检查不阻止整项移除/归档，但归档前 ready 仍须执行。

## 全流程入口与上游新鲜度

主 Agent 首先使用只读 route 判断入口，结合用户明确的 explore/propose 意图与语义判断。EXPLORE 和 PROPOSAL 委托宿主原生 OpenSpec 能力，禁止模拟原生命令或执行聊天 slash shell 命令。探索默认只读；捕获文件需要用户授权。仅探索或仅方案请求在相应阶段停止。完整已有产物可以直接进入 LOAD_CONTEXT，不要求补做 explore/proposal 报告；格式通过不代表需求完整。

运行 `node bridge/checks/bridge.mjs spec-fingerprint --repo . --change <change>` 获取独立规范摘要。它覆盖选定变更全部文件、主规范、OpenSpec config.yaml/yml/json 及 AGENTS.md/CLAUDE.md，规范化文本换行和 tasks.md checkbox 完成状态。任务 ID、描述、需求、设计和护栏变化会使旧 context/planning 失效；业务代码变化不触发重新规划。勾选完成状态仍会使最终工作区摘要失效。

context-report.json 和 planning-report.json 必须含当前 `spec_fingerprint`，公共 fingerprint 仍记录当时工作区。阶段开始和结束都计算规范摘要，若期间变化则重新处理输入，不能签发 PASS。planning 的 task_mapping 必须恰好覆盖当前全部 task ID。旧报告缺少 spec_fingerprint 视为失效，按 LOAD_CONTEXT → PLANNING 重建；保留历史记录，不只修改摘要。ready 同时检查两份上游报告、映射及最终证据，旧规范报告即使配上新最终报告也不能归档。

可选上游报告路径为 bridge/reports/<change>/explore-report.json 和 proposal-report.json。没有变更名时探索只在对话交接，不创建报告目录。这些报告不作为下游必需凭据。路由输出 decision_only=true 只表示建议，不能当成执行或语义通过证据。工具缺失返回 BLOCKED，语义歧义交给用户决定后再调用原生更新入口。

最终工作区摘要包含 context-report.json 和 planning-report.json，绑定有效规范解释和计划内容；其他阶段报告仍排除以避免写报告使自身失效。生成或修改上下文/计划后，重新获取工作区摘要并真实重审下游证据。

## OpenSpec 原生能力缺失时的恢复指引

CLI 已安装不等于当前项目已初始化宿主 Skills。EXPLORE / PROPOSAL 找不到原生入口时，保持当前阶段 BLOCKED，并优先给出以下可执行恢复步骤，不能只说“安装对应 Skill”，也不默认建议授权使用 new/instructions/validate 代替原生工序。

1. 检查 `node --version`、`openspec --version`，区分命令不存在、CLI 过旧、项目未配置当前宿主、或已生成但本次会话未加载。OpenSpec 官方当前要求 Node.js >=20.19.0（Bridge 自身运行时要求仍为 >=20）。检查命令执行失败不等于一定未安装，报告实际错误。
2. **仅 CLI 缺失或版本过旧时**，提示安装或升级：`npm install -g @fission-ai/openspec@latest`，随后 `openspec --version`。已有可用 CLI 不要求重复安装；安装失败时展示错误与官方安装链接，不把失败当成功。
3. **项目尚未为当前宿主生成能力时**，在用户的目标项目根目录执行初始化，而非 Bridge 插件目录。已确认宿主时必须提供展开后的命令，不留下 `xxxxx` 占位符：

   | 当前宿主 | 初始化命令 |
   |---|---|
   | Codex | `openspec init --tools codex --profile core` |
   | Claude Code | `openspec init --tools claude --profile core` |
   | OpenCode | `openspec init --tools opencode --profile core` |
   | Cursor | `openspec init --tools cursor --profile core` |
   | Gemini CLI | `openspec init --tools gemini --profile core` |

   core 包含 explore/propose。其他宿主从官方 Supported Tools 查询准确 ID；无法确认时给出交互式 `openspec init` 并让用户选择当前工具，不猜测 CodeFree 等名称对应的 ID，不默认 `--tools all` 或 `--force`。明确保留项目现有规范与草稿；不自动覆盖冲突文件。
4. **已初始化但指令过旧时**，提示 `openspec update`；若安装的 CLI 本身过旧，先升级 CLI 再 update。项目已初始化但未选择当前宿主，或 profile 不含所需工序时，仍按第 3 步为当前宿主运行带 `--profile core` 的 init；不要只依赖 update 补选宿主。旧 CLI 不支持所列参数时先引导升级，不编造兼容参数。
5. 初始化/更新后检查命令的真实输出与生成路径，并提示按宿主方式重载项目或开启新会话，再发现 `openspec-explore` / `openspec-propose`。当前官方 Codex 路径是 `.agents/skills/openspec-*/SKILL.md`，旧版本可能使用不同路径，以实际 CLI 输出为准；文件存在不等于已加载。Codex 的 `$openspec-propose` 是会话 Skill 引用，不是 shell 命令。
6. 只有真实发现并可调用所需原生能力后才解除 BLOCKED，保留已明确的需求范围，从原阶段继续。初始化和安装会修改环境或项目：本段默认提供指引；用户已明确授权配置时可执行，否则不把业务实现授权自动扩大为全局安装授权。不要为了补依赖修改业务代码、伪造 PASS 或新增方案产物。

Codex 已有 CLI、未初始化时，面向用户的提示示例：

> 当前停在 PROPOSAL：本机已有 OpenSpec CLI，但当前项目尚未发现原生方案 Skill。请在目标项目根目录运行 `openspec init --tools codex --profile core`，随后重载项目或开启新会话。确认可发现 `openspec-propose` 后，可说“继续刚才的 Bridge 方案阶段”；已明确的需求范围保持不变。若初始化提示不支持参数，先升级 OpenSpec CLI 再重试。

官方依据（核对日期：2026-10-21）：[安装](https://github.com/Fission-AI/OpenSpec/blob/main/docs/installation.md)、[init/update CLI](https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md)、[宿主 ID、生成路径与调用方式](https://github.com/Fission-AI/OpenSpec/blob/main/docs/supported-tools.md)。上游文档更新时重新核对，不能将该日期的路径当成所有版本通用约定。
