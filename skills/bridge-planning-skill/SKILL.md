---
name: bridge-planning-skill
description: 在 LOAD_CONTEXT 已通过、需要把 OpenSpec 需求和任务交接给 Superpowers writing-plans 时使用；对应 PLANNING 阶段。
---

# Bridge Planning

先读取同包 `../bridge-load-context-skill/references/workflow.md`。本 Skill 负责上下文交接、调用和映射核验，不编写替代 Superpowers 的实现计划。

## 前置与真实委托

1. 核对 context-report.json 为 PASS，阶段开始运行 `node bridge/checks/bridge.mjs spec-fingerprint --repo . --change <change>`，必须等于 context 的 spec_fingerprint。变化回 LOAD_CONTEXT。
2. 发现宿主实际提供的 `writing-plans` / `superpowers:writing-plans`；按宿主的 Skill 加载机制实际进入并执行完整工作流。只提到名称、读取后借鉴或手写 Bridge JSON，不算执行。找不到能力返回 BLOCKED，按共享契约提供 Superpowers 安装/重载恢复指引，不自行仿制计划。
3. 向 writing-plans 传递有效规范、原生 proposal/design/tasks、稳定 OpenSpec task ID、约束、场景、项目验证命令、执行授权和计划保存偏好。已有上游方案作为输入，不重复发明需求或改写 OpenSpec tasks；有实质歧义才返回上游决定。
4. 由 writing-plans 产出真实 Markdown 实现计划并完成其自查和执行交接。默认使用该宿主 Skill 自己的目录约定（当前常见 `docs/superpowers/plans/`），用户偏好优先。Bridge 报告不能替代计划。用于当前仓库门禁的计划必须保存在仓库内，不能把 OpenSpec 源文件或 bridge/reports JSON 充当实现计划；用户要求仓库外计划时说明需要授权保存仓库内校验副本，不静默改路径。

## 交接映射与验收

5. 阅读实际计划，以 `task_mapping` 关联 OpenSpec task_id → plan_anchor（计划章节/任务锚点）→ requirement_ids/scenario_ids → task_assertions → implementation_files → verification。原生 Task 可拆为多个计划步骤，但不更改其 ID，不把 JSON steps 当实现计划。
6. 每项显式 `kind=behavior` 或 `non_behavior`。行为任务使用真实 test-driven-development；非行为任务填写 tdd_exemption，场景不适用可为空，验证命令和断言仍不可省。覆盖全部有效需求/场景、任务与设计约束。跨任务场景写入 deferred_integration，标明 owner_tasks 与 final_verification；不让当前任务提前承担未来任务的完整集成验收。
7. 原生计划有遗漏时交回 writing-plans 修订后重核对，不能只修饰 Bridge 报告。阶段结束重算 spec-fingerprint，必须与开始相同；再运行 `node bridge/checks/bridge.mjs plan-fingerprint --repo . --plan <仓库内相对路径>`，将真实输出存入 `plan`。
8. 保存 `bridge/reports/<change>/planning-report.json`：公共字段、spec_fingerprint、plan（path/sha256）、invocations.planning（真实 skill/status/evidence）、完整 task_mapping。调用证据记录实际入口、执行过程/输出引用；不把“参考了 Skill”记为 PASS。报告是追踪和验收凭据，不是第二份实现计划。

## 完成与执行交接

真实 writing-plans 完成、计划存在且覆盖完整才 PASS。仅规划授权到此停止。用户已授权端到端时，根据其选择或宿主能力委托 `subagent-driven-development` / `executing-plans`，交完整计划和 Task 内容，不用 Bridge 自建执行器。已有授权不必重新问一遍执行方式；记录选择与授权依据。未知授权或缺能力保持 BLOCKED。计划自身的 commit、worktree、执行交接要求遵循项目/用户授权，不自动授予提交、推送、合并或归档权限。
