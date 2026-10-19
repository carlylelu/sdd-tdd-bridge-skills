---
name: bridge-planning-skill
description: 在 LOAD_CONTEXT 已通过、需要把 OpenSpec 需求和任务交接给实现者时使用；对应 PLANNING 阶段。
---

# Bridge Planning

先读取同包 `../bridge-load-context-skill/references/workflow.md`。检查 context-report.json 为 PASS，核对它列出的规范源内容摘要；规范变化先重新 LOAD_CONTEXT，不能沿用过期上下文。

## 输入与输出

输入：有效规范、设计、tasks.md、允许实现范围、项目验证命令和可用 Superpowers planning 入口。输出：`bridge/reports/<change>/planning-report.json`。该报告就是可执行 planning 交接产物，不再另造一份内容重复的计划。

## 执行

1. 为 tasks.md 中每项任务保留稳定 task_id；为需求和场景建立唯一 ID 与源文件/标题锚点。不额外要求不存在的 spec.md、FR 或 AC 文件。
2. 采用共享契约的 task_mapping 结构，显式关联 task_id → requirement_ids/scenario_ids → implementation_files → verification。
3. 每个场景至少有一项可验证证据。正常、异常、边界、安全和兼容测试按风险决定，不机械规定每个场景两个测试；已有错误场景不再凭空发明额外正常行为。
4. 行为实现采用 RED-GREEN-REFACTOR；文档、配置、移除任务记录合适的检查命令及不适用 TDD 的理由。说明依赖、文件、预期行为、失败原因及通过条件，不能只复制通用的六步口号。
5. 覆盖全部有效场景和全部 task；跨任务场景放入 deferred_integration，记录 owner_tasks 和 final_verification，并为每个责任任务提供可独立验收的 task_assertions。不要把完整集成场景加入每个任务的独立验收清单；其完整性只在最终阶段验收。禁止要求某个 Task 完成其他 Task 的场景。
6. 使用 design.md 的模块边界、接口和架构决策约束计划。新增需求或架构偏离返回 UPSTREAM_CHANGE_REQUIRED。
7. 保存报告，包含公共字段、规范源摘要、完整 task_mapping、未覆盖项及检查结果。提交按可独立审查的变更组织，不强制每任务提交。

## 完成与路由

映射完整且输入有效时 PASS，next_action=IMPLEMENT_TASK。计划本身遗漏映射时在本阶段修正并自查；上游意图不清才请用户决定。不执行代码、测试或提交，不因用户已授权而越过上游需求边界。
