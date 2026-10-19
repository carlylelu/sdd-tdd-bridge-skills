---
name: bridge-spec-compliance-check-skill
description: 在 OpenSpec-Superpowers 衔接流程的 IMPLEMENT_TASK 阶段，每个 Task 实现完成后审查规范合规性。检查实现是否符合 openspec/specs/ 主规范、openspec/changes/ delta 规范、design.md 架构决策和 proposal.md 排除范围。仅负责规范合规审查，不负责代码质量审查。
---

# Bridge Spec Compliance Check 阶段

## 定位

负责在每个 Task 实现完成后，从规范维度审查实现合规性。与 Superpowers 的代码质量审查互补——代码质量审查看"代码写得好不好"，规范合规审查看"代码做了该做的事吗"。使用 OpenSpec 变更名定位：

```text
openspec/changes/<变更名>/
```

## 铁律

任何实现必须与 `openspec/specs/` 中的规范一致。不一致就是 bug。

## 前置条件

开始前必须确认：

- `PLANNING` 阶段已通过（planning 报告为 `PASS`）；
- 当前 Task 已由 Superpowers TDD 实现完成；
- `openspec/changes/<变更名>/` 下的 `proposal.md`、`design.md`、`tasks.md`、`specs/` 存在；
- 主 Agent 提供了当前 Task 的实现范围和关联 FR/AC；
- 当前阶段由用户人工触发。

无法确认 `PLANNING` 已通过时返回 `BLOCKED`。当前 Task 未实现完成时返回 `BLOCKED`。

## 输入

调用方应提供：

- 项目根目录；
- 变更名；
- 当前 Task ID 和描述；
- 当前 Task 关联的 FR 和 AC；
- 当前 Task 的实现文件清单；
- 已通过的 `spec.md`、`design.md`、`tasks.md`、`specs/`；
- `openspec/specs/` 下的主规范；
- 当前项目的 `AGENTS.md` 或 `CLAUDE.md`（如存在）；
- 本次允许检查的范围。

## 输出

- `bridge/reports/<变更名>/compliance-report.md` 中的规范合规审查报告。

不得修改 OpenSpec 的任何产物，也不得修改实现代码。

## 审查步骤

### 1. 读取事实来源

按以下顺序读取：

1. `openspec/specs/` 下的主规范（检查本次实现是否违反了已有需求）；
2. `openspec/changes/<变更名>/specs/` 下的 delta 规范；
3. `openspec/changes/<变更名>/design.md`；
4. `openspec/changes/<变更名>/proposal.md`；
5. 当前 Task 的实现代码和测试代码。

以仓库内文件为事实来源，不得仅依赖对话记忆。

### 2. 逐条检查每个"假设/当/则"场景

- 从 `specs/` 读取全部"假设/当/则"场景；
- 逐条检查每个场景是否有对应实现；
- 检查实现行为是否与场景的"则"（Then）一致；
- 检查异常路径场景是否有对应错误处理。

### 3. 检查 design.md 架构决策是否被遵守

- 读取 `design.md` 中的架构决策；
- 检查实现是否使用了 design.md 指定的技术方案；
- 检查实现是否遵循了 design.md 的模块边界和接口设计；
- 检查实现是否引入了 design.md 未提及的依赖或模块。

### 4. 检查 proposal.md 排除范围是否被违反

- 读取 `proposal.md` 的"排除范围"章节；
- 检查实现是否触及了排除范围中的内容；
- 常见违规：AI"好心"多改了排除范围内的代码。

### 5. 检查主规范是否被违反

- 读取 `openspec/specs/` 下的主规范；
- 检查本次实现是否与已有需求冲突；
- 检查本次实现是否破坏了已有功能。

### 6. 生成审查结论

审查维度：

| 维度 | 检查什么 | 和代码审查的区别 |
|------|----------|------------------|
| 完整性 | 每个需求是否有对应实现 | 代码审查看代码，本审查看规范 |
| 正确性 | 实现是否符合规范意图 | 代码审查看质量，本审查看语义 |
| 一致性 | 实现是否和 design.md 一致 | 代码审查不读 design.md |
| 边界性 | 排除范围是否被违反 | 代码审查不看排除范围 |

### 7. 保存审查报告

每次完成规范合规审查后，必须创建或原地更新：

```text
bridge/reports/<变更名>/compliance-report.md
```

报告至少包含：

- 变更名、阶段 `IMPLEMENT_TASK`、Task ID、检查时间；
- 审查的规范文件清单（主规范 + delta + design + proposal）；
- 逐场景审查结果（场景 → 实现位置 → 合规状态）；
- 架构决策遵守情况；
- 排除范围遵守情况；
- 总体结果：`PASS` 或 `FAILED`。

自查失败时也必须保存真实失败结果。重新检查时原地更新同一个报告，不创建平行版本。

## 常见问题

- "AI 顺手多改了代码"：检查排除范围
- "实现方式和 design.md 不一致"：这是 bug，不是优化
- "场景没有覆盖"：测试不完整
- "实现破坏了已有功能"：检查主规范

## 自查失败处理

任一审查项不通过时，先将失败结果写入报告，再返回 `FAILED`。不得自动修改，也不得自动重试。

主 Agent 向用户展示问题。只有用户明确确认后，才能按确认范围重新调用本 Skill 协助修改并重新执行相关审查。

如果问题来自 OpenSpec 产物本身（如 design.md 决策不合理），应返回 `UPSTREAM_CHANGE_REQUIRED`，由用户决定是否回退 OpenSpec propose 阶段。

## 返回协议

```yaml
result: PASS | FAILED | BLOCKED | NEEDS_CLARIFICATION | UPSTREAM_CHANGE_REQUIRED
stage: IMPLEMENT_TASK
change_id: <变更名>
task_id: <当前 Task>
outputs:
  - bridge/reports/<变更名>/compliance-report.md
report:
  path: bridge/reports/<变更名>/compliance-report.md
  status: PASS | FAILED | BLOCKED | NEEDS_CLARIFICATION | UPSTREAM_CHANGE_REQUIRED
checks:
  scenario_coverage: PASS | FAILED
  design_compliance: PASS | FAILED
  exclusion_scope: PASS | FAILED
  main_spec_compliance: PASS | FAILED
scenario_validation:
  - scenario: <场景描述>
    implementation_ref: <代码位置>
    status: COMPLIANT | NON_COMPLIANT
    evidence: <判断依据>
issues:
  - type: SCENARIO_MISSING | DESIGN_VIOLATION | EXCLUSION_VIOLATION | MAIN_SPEC_VIOLATION
    file: <文件路径>
    location: <代码位置或规范条目>
    reason: <失败原因>
    evidence: <判断依据>
    suggestion: <修改建议>
next_action: <下一步>
```

`PASS` 时，审查报告也必须为 `PASS`。`next_action` 应通知主 Agent 继续下一个 Task，或全部 Task 完成后进入 `DUAL_VERIFY` 阶段。

## 禁止事项

- 不在 `PLANNING` 未通过时执行审查；
- 不修改 OpenSpec 的任何产物；
- 不修改实现代码；
- 不在自查失败后未经用户确认自动修改；
- 不设置自动重试循环；
- 不执行代码质量审查（由 Superpowers 负责）；
- 不创建 `compliance-report-v2.md` 等平行报告；
- 不在报告缺失、报告状态不一致或审查未通过时返回 `PASS`。

## 完成条件

只有全部"假设/当/则"场景有对应实现、design.md 架构决策被遵守、proposal.md 排除范围未被违反、主规范未被破坏、审查报告为 `PASS` 时，才能返回 `PASS`。返回后由主 Agent 继续下一个 Task 或进入 `DUAL_VERIFY` 阶段。
