---
name: bridge-planning-skill
description: 在 OpenSpec-Superpowers 衔接流程的 PLANNING 阶段，把 design.md 作为 Superpowers planning 输入，把 specs/ 场景转 TDD 测试用例，把 tasks.md 拆成 Superpowers plan 粒度，执行场景覆盖完整性检查并生成报告。仅负责 planning 转换，不负责实现或验证。
---

# Bridge Planning 阶段

## 定位

负责把 OpenSpec 产物转换为 Superpowers planning 输入，建立"场景 → 测试用例"和"task → plan 粒度"的映射，并生成 planning 报告。使用 OpenSpec 变更名定位：

```text
openspec/changes/<变更名>/
```

## 前置条件

开始前必须确认：

- `LOAD_CONTEXT` 阶段已通过（加载报告为 `PASS`）；
- `openspec/changes/<变更名>/` 下的 `design.md`、`tasks.md`、`specs/` 存在且通过格式检查；
- 主 Agent 提供了上一阶段的 `PASS` 结果或等价可信结果；
- 当前阶段由用户人工触发。

无法确认 `LOAD_CONTEXT` 已通过时返回 `BLOCKED`，不得执行 planning 转换。

## 输入

调用方应提供：

- 项目根目录；
- 变更名；
- 已通过加载的 `design.md`、`tasks.md`、`specs/`；
- `openspec/specs/` 下的主规范；
- 当前项目的 `AGENTS.md` 或 `CLAUDE.md`（如存在）；
- 本次允许生成或修改的范围。

## 输出

- `bridge/reports/<变更名>/planning-report.md` 中的 planning 报告。

报告包含场景到测试用例的映射表和 task 到 plan 粒度的转换表。不得修改 OpenSpec 的任何产物。

## 执行流程

### 1. 读取事实来源

按以下顺序读取：

1. 已通过的 `context-report.md`；
2. `openspec/changes/<变更名>/design.md`；
3. `openspec/changes/<变更名>/tasks.md`；
4. `openspec/changes/<变更名>/specs/` 下的所有增量规范；
5. `AGENTS.md` 或 `CLAUDE.md`（如存在）。

以仓库内文件为事实来源，不得仅依赖对话记忆。

### 2. 把 design.md 作为 Superpowers planning 输入

- 读取 `design.md` 中的技术方案和架构决策；
- 提取关键设计决策作为 Superpowers planning 的约束输入；
- 确认 Superpowers planning 基于这些设计决策，而不是 AI 自行猜测。

### 3. 把 specs/ 场景转 TDD 测试用例

OpenSpec 的"假设/当/则"场景映射为测试用例，每个场景至少需要两个测试：

1. **正常路径测试**：假设对应 setup，当对应 action，则对应 assertion
2. **错误路径测试**：假设对应异常条件，当对应 action，则对应错误 assertion
3. **边界值测试**：如果场景涉及数值、时间等边界，额外添加

为每个场景生成测试用例映射记录：

```yaml
- scenario: <场景描述>
  scenario_file: <specs/ 文件路径>
  normal_test:
    name: <测试名称>
    setup: <假设>
    action: <当>
    assertion: <则>
  error_test:
    name: <测试名称>
    setup: <异常条件>
    action: <当>
    assertion: <错误 assertion>
  boundary_test:
    name: <测试名称，如无边界值则为 NONE>
```

### 4. 把 tasks.md 拆成 Superpowers plan 粒度

OpenSpec 的 task（说什么）→ Superpowers 的 plan（怎么做）：

| OpenSpec task | Superpowers plan |
|---------------|------------------|
| <task 描述> | 1.写失败测试 2.运行测试 3.写最小实现 4.运行测试 5.重构 6.提交 |

为每个 task 生成 plan 粒度转换记录：

```yaml
- task: <OpenSpec task 描述>
  task_file: <tasks.md 位置>
  plan_steps:
    - 1. 写失败测试：<测试名称>
    - 2. 运行测试，确认失败
    - 3. 写最小实现
    - 4. 运行测试，确认通过
    - 5. 重构
    - 6. 提交
```

### 5. 场景覆盖完整性检查

- 检查 `specs/` 下的每个"假设/当/则"场景是否都有对应的测试用例映射；
- 检查每个场景是否至少有正常路径和错误路径两个测试；
- 检查涉及边界值的场景是否有边界值测试；
- 检查 `tasks.md` 中的每个 task 是否都有对应的 plan 粒度转换；
- 检查 plan 步骤是否遵循 TDD RED-GREEN-REFACTOR 循环。

任一检查不通过时返回 `FAILED`，列出缺失的场景或 task。

### 6. 保存 planning 报告

每次完成 planning 转换后，必须创建或原地更新：

```text
bridge/reports/<变更名>/planning-report.md
```

报告至少包含：

- 变更名、阶段 `PLANNING`、检查时间；
- design.md 关键设计决策摘要；
- 场景到测试用例的完整映射表；
- task 到 plan 粒度的完整转换表；
- 场景覆盖完整性检查结果；
- 总体结果：`PASS` 或 `FAILED`。

自查失败时也必须保存真实失败结果。重新检查时原地更新同一个报告，不创建平行版本。

## 自查失败处理

任一检查不通过时，先将失败结果写入报告，再返回 `FAILED`。不得自动修改，也不得自动重试。

主 Agent 向用户展示问题。只有用户明确确认后，才能按确认范围重新调用本 Skill 协助修改并重新执行相关检查。

如果问题来自 OpenSpec 产物本身（如 specs/ 场景不完整），应返回 `UPSTREAM_CHANGE_REQUIRED`，由用户决定是否回退 OpenSpec propose 阶段。

## 返回协议

```yaml
result: PASS | FAILED | BLOCKED | NEEDS_CLARIFICATION | UPSTREAM_CHANGE_REQUIRED
stage: PLANNING
change_id: <变更名>
outputs:
  - bridge/reports/<变更名>/planning-report.md
report:
  path: bridge/reports/<变更名>/planning-report.md
  status: PASS | FAILED | BLOCKED | NEEDS_CLARIFICATION | UPSTREAM_CHANGE_REQUIRED
checks:
  design_loaded: PASS | FAILED
  scenario_coverage: PASS | FAILED
  test_case_completeness: PASS | FAILED
  task_to_plan_mapping: PASS | FAILED
  tdd_cycle: PASS | FAILED
scenario_mapping:
  - scenario: <场景描述>
    normal_test: <测试名称>
    error_test: <测试名称>
    boundary_test: <测试名称或 NONE>
    status: MAPPED | FAILED
task_mapping:
  - task: <task 描述>
    plan_steps: <步骤数>
    status: MAPPED | FAILED
issues:
  - type: DETERMINISTIC | AGENT_REVIEW
    file: <文件路径>
    location: <章节或场景>
    reason: <失败原因>
    evidence: <判断依据>
    suggestion: <修改建议>
next_action: <下一步>
```

`PASS` 时，planning 报告也必须为 `PASS`。`next_action` 应通知主 Agent 进入 Superpowers TDD 实现阶段，每个 Task 实现完成后调用 `bridge-spec-compliance-check-skill`。

## 禁止事项

- 不在 `LOAD_CONTEXT` 未通过时执行 planning；
- 不修改 OpenSpec 的任何产物；
- 不执行代码实现或测试；
- 不在自查失败后未经用户确认自动修改；
- 不设置自动重试循环；
- 不创建 `planning-report-v2.md` 等平行报告；
- 不在报告缺失、报告状态不一致或检查未通过时返回 `PASS`。

## 完成条件

只有 design.md 加载完成、场景到测试用例映射完整、task 到 plan 粒度转换完整、场景覆盖完整性检查通过、planning 报告为 `PASS` 时，才能返回 `PASS`。返回后由主 Agent 进入 Superpowers TDD 实现阶段。
