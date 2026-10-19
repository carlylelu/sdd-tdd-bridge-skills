---
name: bridge-load-context-skill
description: 在 OpenSpec-Superpowers 衔接流程的 LOAD_CONTEXT 阶段，加载 openspec/specs/ 主规范和 openspec/changes/ 变更文档，确认当前变更目录，执行 OpenSpec 产物格式检查并生成报告。仅负责加载上下文和格式检查，不负责 planning、实现或验证。
---

# Bridge Load Context 阶段

## 定位

负责在 OpenSpec-Superpowers 衔接流程开始时加载规范上下文，确认当前变更目录，执行 OpenSpec 产物格式确定性检查，并生成加载报告。使用 OpenSpec 变更名定位：

```text
openspec/changes/<变更名>/
```

## 前置条件

开始前必须确认：

- OpenSpec explore 和 propose 已完成；
- `openspec/changes/` 下存在至少一个未归档变更目录；
- 变更目录包含 `proposal.md`、`design.md`、`tasks.md`；
- `openspec/specs/` 下存在主规范（或项目首次变更时为空）；
- 当前阶段由用户人工触发。

无法确认 OpenSpec explore 和 propose 已完成时返回 `BLOCKED`，不得加载上下文，也不得自行批准前置条件。

## 输入

调用方应提供：

- 项目根目录；
- 变更名（如未指定，从 `openspec/changes/` 扫描）；
- `openspec/specs/` 下的主规范；
- `openspec/changes/<变更名>/` 下的所有产物；
- 当前项目的 `AGENTS.md` 或 `CLAUDE.md`（如存在）；
- 本次允许检查的范围。

## 输出

- `bridge/reports/<变更名>/context-report.md` 中的加载报告。

不得生成当前阶段范围之外的产物，也不得修改 OpenSpec 的任何文件。

## 执行流程

### 1. 读取事实来源

按以下顺序读取：

1. `AGENTS.md` 或 `CLAUDE.md`（如存在）；
2. `openspec/specs/` 下的主规范（了解已有约束）；
3. `openspec/changes/` 下的变更目录列表；
4. 当前变更目录下的所有文档（`proposal.md`、`design.md`、`tasks.md`、`specs/`）。

以仓库内文件为事实来源，不得仅依赖对话记忆。

### 2. 确认当前变更目录

- 如果用户指定了变更名，确认 `openspec/changes/<变更名>/` 存在；
- 如果用户未指定，运行 `ls openspec/changes/` 查看未归档的变更文件夹；
- 如果只有一个变更目录，那就是当前变更；
- 如果有多个变更目录，返回 `NEEDS_CLARIFICATION`，要求用户确认；
- 如果没有变更目录，返回 `BLOCKED`，说明 OpenSpec explore 和 propose 尚未完成。

### 3. 执行 OpenSpec 产物格式检查

调用 `bridge/checks/openspec-format-check` 执行确定性检查，检查项包括：

- 变更目录包含 `proposal.md`、`design.md`、`tasks.md` 三个基础文件；
- `proposal.md` 包含"范围"和"排除范围"章节；
- `design.md` 包含技术方案和架构决策；
- `tasks.md` 包含可执行的任务清单；
- `specs/` 下的增量规范包含"假设/当/则"（Given/When/Then）场景；
- 不存在未完成的占位符（TODO、TBD、待补充）。

脚本非零退出、执行异常或结果缺失时返回 `FAILED`，不得由 Agent 改判。

### 4. 保存加载报告

每次完成加载检查后，必须创建或原地更新：

```text
bridge/reports/<变更名>/context-report.md
```

报告至少包含：

- 变更名、阶段 `LOAD_CONTEXT`、检查时间；
- 本次检查的文件清单（主规范 + 变更产物）；
- OpenSpec 产物格式检查的逐项结果、依据、问题和修改建议；
- 变更目录确认结果；
- 总体结果：`PASS`、`FAILED`、`BLOCKED` 或 `NEEDS_CLARIFICATION`。

自查失败时也必须保存真实失败结果。重新检查时原地更新同一个报告，不创建平行版本。报告总体结果必须与返回协议中的 `result` 一致。

## 自查失败处理

任一检查不通过时，先将失败结果写入报告，再返回 `FAILED`。不得自动修改，也不得自动重试。

主 Agent 向用户展示问题。只有用户明确确认后，才能按确认范围重新调用本 Skill 协助修改并重新执行相关检查；仍不通过时再次返回问题。

如果问题来自 OpenSpec 产物本身（如 proposal.md 缺少排除范围），不得擅自修改 OpenSpec 产物，应返回 `UPSTREAM_CHANGE_REQUIRED`，由用户决定是否回退 OpenSpec propose 阶段。

## 返回协议

```yaml
result: PASS | FAILED | BLOCKED | NEEDS_CLARIFICATION | UPSTREAM_CHANGE_REQUIRED
stage: LOAD_CONTEXT
change_id: <变更名>
outputs:
  - bridge/reports/<变更名>/context-report.md
report:
  path: bridge/reports/<变更名>/context-report.md
  status: PASS | FAILED | BLOCKED | NEEDS_CLARIFICATION | UPSTREAM_CHANGE_REQUIRED
checks:
  change_dir_exists: PASS | FAILED
  base_files_exist: PASS | FAILED
  proposal_scope: PASS | FAILED
  design_content: PASS | FAILED
  tasks_content: PASS | FAILED
  specs_scenarios: PASS | FAILED
  no_placeholders: PASS | FAILED
issues:
  - type: DETERMINISTIC | AGENT_REVIEW
    file: <文件路径>
    location: <章节或行号>
    reason: <失败原因>
    evidence: <判断依据>
    suggestion: <修改建议>
next_action: <下一步>
```

`PASS` 时，加载报告也必须为 `PASS`。`next_action` 应通知主 Agent 跳过 Superpowers brainstorming，直接进入 PLANNING 阶段。

## 禁止事项

- 不在 OpenSpec explore 和 propose 未完成时加载上下文；
- 不修改 OpenSpec 的任何产物；
- 不在自查失败后未经用户确认自动修改；
- 不设置自动重试循环；
- 不执行 planning、实现或验证；
- 不创建 `context-report-v2.md` 等平行报告；
- 不在报告缺失、报告状态不一致或检查未通过时返回 `PASS`。

## 完成条件

只有当前变更目录确认完成、OpenSpec 产物格式检查全部通过、加载报告为 `PASS` 时，才能返回 `PASS`。返回后由主 Agent 跳过 Superpowers brainstorming，进入 PLANNING 阶段。
