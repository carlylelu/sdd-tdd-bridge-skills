---
name: bridge-dual-verify-skill
description: 在 OpenSpec-Superpowers 衔接流程的 DUAL_VERIFY 阶段，全部 Task 实现完成后执行双重验证：OpenSpec verify（规范维度）+ Superpowers verification（代码维度）。两个验证都通过才能 archive。仅负责验证触发和结果汇总，不负责实现或归档。
---

# Bridge Dual Verify 阶段

## 定位

负责在全部 Task 实现完成后，执行双重验证并汇总结果。使用 OpenSpec 变更名定位：

```text
openspec/changes/<变更名>/
```

## 铁律

verify 和代码审查二选一是常见坑。两个都要做。代码审查看质量，verify 看合规。它们检查的东西不一样，互补不替代。两个验证都通过，才能 archive。

## 前置条件

开始前必须确认：

- 全部 Task 已由 Superpowers TDD 实现完成；
- 每个 Task 的 `bridge-spec-compliance-check-skill` 审查均为 `PASS`；
- `bridge/reports/<变更名>/compliance-report.md` 存在且为 `PASS`；
- 主 Agent 提供了全部 Task 完成的确认；
- 当前阶段由用户人工触发。

无法确认全部 Task 完成时返回 `BLOCKED`，不得执行验证。

## 输入

调用方应提供：

- 项目根目录；
- 变更名；
- 全部 Task 清单和实现文件清单；
- 已通过的 `compliance-report.md`；
- `openspec/changes/<变更名>/` 下的所有产物；
- `openspec/specs/` 下的主规范；
- 当前项目的 `AGENTS.md` 或 `CLAUDE.md`（如存在）；
- 项目对应的测试命令（如 `go test ./...`、`npm test`、`pytest` 等）。

## 输出

- `bridge/reports/<变更名>/verify-report.md` 中的双重验证报告。

不得修改 OpenSpec 的任何产物，也不得修改实现代码。

## 执行流程

### 1. 读取事实来源

按以下顺序读取：

1. `bridge/reports/<变更名>/compliance-report.md`；
2. `openspec/changes/<变更名>/` 下的所有产物；
3. `openspec/specs/` 下的主规范；
4. 全部 Task 的实现代码和测试代码。

以仓库内文件为事实来源，不得仅依赖对话记忆。

### 2. 执行 OpenSpec verify（规范维度验证）

- 运行 OpenSpec `/opsx:verify` 命令；
- verify 从三个维度检查：
  - **完整性**：每个需求是否有对应实现
  - **正确性**：实现是否符合规范意图
  - **一致性**：实现是否和 design.md 一致
- 记录 verify 的返回结果和证据；
- verify 不通过时，记录失败项，不继续执行 Superpowers verification。

### 3. 执行 Superpowers verification（代码维度验证）

- OpenSpec verify 通过后，运行 Superpowers verification；
- 按项目类型跑全量测试：
  - Go 项目：`go test ./...`
  - Node.js 项目：`npm test`
  - Python 项目：`pytest`
  - Java 项目：`mvn test` 或 `gradle test`
  - 其他项目：按 `AGENTS.md` 或项目配置声明的测试命令
- 记录测试命令、退出码、通过数、失败数；
- 测试不通过时，记录失败项。

### 4. 汇总双重验证结果

| 验证维度 | 检查什么 | 通过条件 |
|---------|---------|---------|
| OpenSpec verify | 规范合规、场景覆盖、架构一致 | verify 返回 PASS |
| Superpowers verification | 测试通过、代码可工作 | 全量测试退出码 0 |

只有两个验证都通过时，`DUAL_VERIFY` 才能返回 `PASS`。

### 5. 保存验证报告

每次完成双重验证后，必须创建或原地更新：

```text
bridge/reports/<变更名>/verify-report.md
```

报告至少包含：

- 变更名、阶段 `DUAL_VERIFY`、检查时间；
- OpenSpec verify 的返回结果和证据；
- Superpowers verification 的测试命令、退出码、通过数、失败数；
- 双重验证汇总结果；
- 总体结果：`PASS` 或 `FAILED`。

自查失败时也必须保存真实失败结果。重新检查时原地更新同一个报告，不创建平行版本。

## 自查失败处理

任一验证不通过时，先将失败结果写入报告，再返回 `FAILED`。不得自动修改，也不得自动重试。

主 Agent 向用户展示问题：

```text
当前阶段：DUAL_VERIFY
变更名：<变更名>

验证结果：不通过

失败项：
1. <验证维度>
   原因：<失败原因>
   证据：<命令输出或 verify 结果>
   建议：<建议处理方式>

是否需要 AI 协助修改？
```

只有用户明确确认后，才能按确认范围重新调用本 Skill 协助修改并重新执行相关验证。

## 返回协议

```yaml
result: PASS | FAILED | BLOCKED | NEEDS_CLARIFICATION
stage: DUAL_VERIFY
change_id: <变更名>
outputs:
  - bridge/reports/<变更名>/verify-report.md
report:
  path: bridge/reports/<变更名>/verify-report.md
  status: PASS | FAILED | BLOCKED | NEEDS_CLARIFICATION
checks:
  openspec_verify: PASS | FAILED | NOT_RUN
  superpowers_verification: PASS | FAILED | NOT_RUN
  dual_verify_summary: PASS | FAILED
verify_details:
  openspec_verify:
    result: PASS | FAILED
    evidence: <verify 返回结果>
  superpowers_verification:
    command: <实际执行命令>
    exit_code: <退出码>
    passed: <通过数>
    failed: <失败数>
    evidence: <测试输出摘要>
issues:
  - type: OPENSPEC_VERIFY_FAILED | SUPERPOWERS_VERIFICATION_FAILED
    reason: <失败原因>
    evidence: <判断依据>
    suggestion: <修改建议>
next_action: <下一步>
```

`PASS` 时，验证报告也必须为 `PASS`，且 `openspec_verify` 和 `superpowers_verification` 均为 `PASS`。`next_action` 应通知主 Agent 执行 OpenSpec `/opsx:archive`。

## 禁止事项

- 不在全部 Task 未完成时执行验证；
- 不在 `compliance-report.md` 非 `PASS` 时执行验证；
- 不只做 verify 或只做 Superpowers verification（必须两个都做）；
- 不在 OpenSpec verify 未通过时继续执行 Superpowers verification；
- 不修改 OpenSpec 的任何产物；
- 不修改实现代码；
- 不在自查失败后未经用户确认自动修改；
- 不设置自动重试循环；
- 不执行 archive（由主 Agent 调用 OpenSpec `/opsx:archive`）；
- 不创建 `verify-report-v2.md` 等平行报告；
- 不在报告缺失、报告状态不一致或验证未通过时返回 `PASS`。

## 完成条件

只有 OpenSpec verify 返回 `PASS`、Superpowers verification 全量测试通过、双重验证汇总为 `PASS`、验证报告为 `PASS` 时，才能返回 `PASS`。返回后由主 Agent 执行 OpenSpec `/opsx:archive`，归档变更并更新主规范。
