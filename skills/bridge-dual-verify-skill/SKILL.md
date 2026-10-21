---
name: bridge-dual-verify-skill
description: 在全部 OpenSpec Task 完成、准备最终验收和归档时使用；对应 DUAL_VERIFY 阶段。
---

# Bridge Final Verification

先读取同包 `../bridge-load-context-skill/references/workflow.md`。本阶段只验证和写报告，不修改业务代码、不归档。

先按共享契约“检查器路径绑定与只读预检”从当前加载的完整插件包解析 BRIDGE_CLI，确认绝对 PROJECT_ROOT，并执行 runtime；不要假定项目内已有 bridge/checks，也不要求先安装 Hook。所有命令替换为已绑定的真实路径，缺失或失败不得用 OpenSpec validate 替代。

## 前置与输入

全部任务已完成、完成标记已同步 tasks.md；提供所有逐任务报告、有效规范、task_mapping、实际宿主验证入口和项目完整验证命令。未完成返回 BLOCKED，不能把最后一个任务 PASS 视为全部任务通过。

## 执行

1. 重读实际需求、代码与测试，核对规范源和映射未变化。规范变化回到 LOAD_CONTEXT/PLANNING；实现变化重新审查受影响任务。
2. 在最终工作区重新确认全部任务关联行为、共享约束、回归和代码质量，刷新逐任务报告到最终摘要。不得只修改旧报告中的 fingerprint 或 checked_at。
3. 执行最终全量场景覆盖和跨任务集成检查，包括全部 deferred_integration 项、有效主规范、delta 修改/删除和设计一致性。任何延后项未验证都不得 PASS。
4. 实际调用 requesting-code-review，对最终全部差异（实际基线到 HEAD、暂存/未暂存及未跟踪实现文件）执行独立代码质量审查，不能以逐任务旧结论或自己复述取代。随后调用实际可用的 OpenSpec verify。`/opsx:verify` 是宿主命令示例，不作为通用 shell 命令执行。记录真实结果及报告引用；缺少入口 BLOCKED。OpenSpec core profile 不保证包含 verify；此时提示 `openspec config profile` 选择启用 verify，再于目标项目运行 `openspec update`，重载后发现真实入口。不能将 CLI validate 等同于语义 verify。
5. 必须实际调用 Superpowers verification-before-completion，由该 Skill 按项目验证流程执行全部规定命令；项目命令是输入，不能用“运行了项目测试”省略该 Skill。命令取自项目配置/护栏，不把 npm test 视为所有 Node 项目的充分验证。记录每条命令、退出码、日志位置和实际覆盖范围；未能获取数量时记录 unknown，不能编造。
6. 规范检查失败仍可收集独立且安全的命令验证证据，便于一次性诊断；任一必需项失败都不能 PASS。零测试或跳过范围需要说明适用的验收依据，不能只凭退出码 0。
7. 保存 `bridge/reports/<change>/verify-report.json`。包含公共字段、完整 tasks ID 列表、checks（full_scenario_coverage、effective_spec_compliance、code_review）、openspec_verify（entry/result/evidence）、verification（command/exit_code/evidence 数组）。包含 invocations.verification（verification-before-completion）和 invocations.code_review（requesting-code-review）的实际执行凭据。引用全部逐任务 JSON；可附 Markdown 汇总。
8. 执行 `node "<BRIDGE_CLI>" ready --repo "<PROJECT_ROOT>" --change <change>`，记录实际结果。任何失败、过期报告、遗漏任务或命令失败都不得通知归档。

## 完成与路由

全部维度真实通过且 ready 为 PASS 后返回 PASS，next_action=ARCHIVE，由主 Agent 在授权范围调用宿主归档。验证到归档之间输入变化必须重新验证。

实现问题 FAILED → 实现者修复 → 受影响任务重审 → 重验；需求/架构改变 UPSTREAM_CHANGE_REQUIRED → 用户决定；工具/环境异常 BLOCKED。沿用已有修复授权，不重复审批；本验证 Skill 始终不修改实现。

最终 ready 同时要求 context/planning 的 spec_fingerprint 新鲜。规范变化先回 LOAD_CONTEXT 和 PLANNING；仅勾选完成状态不需重做规划，但需要重新确认最终工作区证据。不得只改摘要或时间。
