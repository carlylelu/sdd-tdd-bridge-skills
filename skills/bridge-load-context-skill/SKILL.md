---
name: bridge-load-context-skill
description: 在已准备好 OpenSpec 变更、需要进入实现或恢复衔接流程时使用；对应 LOAD_CONTEXT 阶段。
---

# Bridge Load Context

先读取本 Skill 的 `references/workflow.md`。它是四阶段共用的规范合并、授权、报告和失败路由契约。

## 输入与前置条件

项目根目录、变更名（未指定时发现活跃变更）、允许范围。读取项目护栏和宿主依赖；不要求用户证明曾运行某条 explore/propose 命令，以产物内容足以进入实现为准。用户已授权连续流程时不重复要求人工触发。

变更应包含 proposal.md、design.md、tasks.md、specs/。缺少上游产物返回 UPSTREAM_CHANGE_REQUIRED；宿主工具/Skill 缺失返回 BLOCKED。无活跃变更则说明事实和恢复条件，不能假称前置命令已完成。

## 执行

1. 读取 AGENTS.md / CLAUDE.md、openspec/specs/ 和当前变更文档。发现对象时排除 archive；多变更未指定才 NEEDS_CLARIFICATION。
2. 调用 `node bridge/checks/bridge.mjs format --repo . --change <change>`。读取实际 JSON 结果；非零退出不得改判。
3. 按共享契约构造有效规范：ADDED/MODIFIED/REMOVED/RENAMED 的来源、目标和最终约束。主规范 30 分钟而 delta 修改为 15 分钟时采用 15 分钟。不能同时要求旧新行为。
4. 列出规范源路径、内容摘要、有效 requirement/scenario ID 和设计约束。首次变更没有主规范可以接受，delta 仍必须完整。
5. 确认设计和需求足以交接后，记录跳过重复 brainstorming 的依据。
6. 保存 `bridge/reports/<change>/context-report.json`。必须包含统一字段、实际格式检查输出、有效规范表、规范源摘要和检查文件清单。失败也保存真实结论；可附 Markdown 摘要。

## 完成与路由

只有格式检查和有效规范解析通过才 PASS，next_action=PLANNING。上游歧义返回 UPSTREAM_CHANGE_REQUIRED；不擅自修改 OpenSpec 文件，不执行实现。语义判断属于 Agent 审查，不能宣称格式检查已证明范围合规。
