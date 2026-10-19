# Bridge 统一流程契约（schema_version: 1）

四个阶段和主 Agent 共用此契约。宿主的系统指令、项目护栏和用户授权优先。此文件不授予提交、推送或发布权限。

## 有效规范

有效规范 = 主规范应用本次 delta 后的结果。LOAD_CONTEXT 必须列出 requirement 的基线位置、delta 位置、操作及最终要求。

- ADDED：添加需求；与已有同名需求冲突时返回 UPSTREAM_CHANGE_REQUIRED。
- MODIFIED：以 delta 中完整的新要求替代旧要求；未修改需求继续有效。
- REMOVED：不再要求实现被删除行为，同时验证其移除不会破坏仍有效的约束。
- RENAMED：明确旧名到新名的映射，保留关联场景的追踪；无法定位旧名则阻塞。
- 同一需求存在互相矛盾的操作、delta 不完整或目标不明确时，不自行猜测。返回 UPSTREAM_CHANGE_REQUIRED，由用户决定上游变更。

例如主规范令牌有效期 30 分钟，MODIFIED 改为 15 分钟，则按 15 分钟验证。其他未修改的鉴权要求仍须遵守。格式检查只验证结构，不能替代此语义判断。

## 授权和阶段状态

用户已授权端到端实现时，可连续执行 LOAD_CONTEXT → PLANNING → IMPLEMENT_TASK（循环）→ DUAL_VERIFY → ARCHIVE；用户只授权单阶段时，到该阶段终点停止。不要求每个阶段重复人工触发。归档仍须在用户授权范围和宿主工具权限内。

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

运行 `node bridge/checks/bridge.mjs fingerprint --repo .` 获取工作区摘要：覆盖 Git 跟踪文件及未忽略的新文件、删除和执行权限；排除 bridge/reports/、.bridge-hooks/、bridge/install-state.json，避免报告写入使自身失效。忽略文件（如构建产物）和外部服务不在摘要中，需另列环境/命令证据；子模块须单独验证。

Task 报告绑定审查时的摘要。最终阶段采用保守策略：全部 task 报告必须在最终工作区重新确认；先更新任务完成标记，再生成摘要，实际复查关联行为、回归和代码审查，不能只替换摘要或时间。任何代码/规范/任务清单变化使旧 PASS 失效。恢复时重算摘要、查看任务清单和证据，不凭聊天记录认定完成。

LOAD_CONTEXT / PLANNING 的输入依赖是规范、护栏和映射；实现期间正常的代码变化不要求重新做需求分析。主 Agent 必须核对上游报告列出的规范源内容是否变化：规范或映射变化则回退相应阶段。最终 ready 对 Task 和验证报告使用全工作区摘要。

## 最终闸门和能力边界

完成全部任务后：执行最终规范审查、宿主 OpenSpec verify、代码质量审查及项目声明的全量验证命令。规范审查与命令验证各自收集证据；一项失败不妨碍运行另一项安全的只读验证，但任何一项失败都不能归档。命令不存在、零测试、跳过用例或覆盖范围不足不能仅凭退出码 0 判 PASS；记录适用的验收理由。

归档前必须执行 `node bridge/checks/bridge.mjs ready --repo . --change <change>`。该命令检查格式、任务完成、逐任务报告、最终覆盖、OpenSpec 结果、命令退出码和摘要新鲜度；它不执行测试、不证明证据真实性、不解释需求语义，也不能拦截从其他入口直接运行的 OpenSpec archive。主 Agent 只能在该命令 PASS 且宿主验证真实完成后调用宿主归档入口。

OpenSpec/Superpowers 的名称空间和命令形式因宿主而异。先确认实际可用的 Skill/命令，禁止把 `/opsx:verify` 当成所有宿主都支持的 shell 命令。缺失则 BLOCKED。归档目录由宿主确定；本地检查支持 openspec/changes/archive/ 和 openspec/archive/，并从活跃变更发现中排除 archive。格式检查不阻止整项移除/归档，但归档前 ready 仍须执行。
