---
name: bridge-spec-compliance-check-skill
description: 在某个 OpenSpec Task 已实现、需要核对其关联规范及回归影响时使用；对应 IMPLEMENT_TASK 审查。
---

# Bridge Task Compliance

先读取同包 `../bridge-load-context-skill/references/workflow.md`。本 Skill 只审查，不修改实现；代码质量审查由 Superpowers 或项目明确的审查入口执行，两者都需记录。

## 前置与输入

planning-report.json 为 PASS 且规范源/映射未变化。调用方提供 change_id、当前 task_id、该任务的实现与测试文件、代码质量审查证据。场景和需求关联从 task_mapping 读取；缺失映射返回 PLANNING 修复，不自行猜测 FR/AC。

## 执行

1. 读取 context 中有效规范、planning 中当前任务关联、设计、排除范围及实际实现差异。
2. 只审查当前 task_id 的 task_assertions、可独立完成的场景和共享约束，确认实现和断言符合有效规范。deferred_integration 中的完整跨任务场景留到 DUAL_VERIFY，记录本任务片段证据，不提前宣称集成通过。未来任务的未实现场景标记为后续任务责任，不据此拒绝当前任务。
3. 检查 ADDED/MODIFIED/REMOVED/RENAMED 后的最终要求，以及未受影响主规范的回归；被合法修改/删除的旧行为不是必须保留的约束。
4. 检查模块边界、接口、依赖和排除范围；新增需求或架构变化交回上游决定。
5. 核对关联验证命令及结果、代码质量审查证据。不能用规范审查替代代码质量审查。
6. 执行 `node bridge/checks/bridge.mjs fingerprint --repo .`，保存 `bridge/reports/<change>/tasks/<task_id>.json`。公共字段之外必须包含 task_id、关联场景、实现/测试位置和 checks：scenario_coverage、design_compliance、exclusion_scope、regression、code_review。每项 PASS 必须有真实证据。
7. 失败时更新当前任务报告，保留其他任务的报告；不得用单一 compliance-report.md 覆盖整个变更的审查历史。

## 完成与路由

当前任务独立验收断言/场景、设计、边界、回归及代码质量均通过才 PASS。deferred_integration 尚未完整实现不影响本任务 PASS，但必须保留给最终阶段验收。继续下一任务；全部完成后交 DUAL_VERIFY 执行全量检查。

实现问题 FAILED → 主 Agent 返回实现者修复并重新审查；规范意图问题 UPSTREAM_CHANGE_REQUIRED → 用户决定；依赖或证据缺失 BLOCKED。普通修复沿用已有授权，不由只读审查 Skill 修改代码。
