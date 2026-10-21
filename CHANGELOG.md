# 版本日志

## [2.1.1] - 2026-10-21

- 原生 OpenSpec Skill 缺失时提供按宿主区分的安装、项目 init、更新和重载指引，避免只返回 BLOCKED 或默认建议底层 CLI 绕过。
- 根据 2026-10-21 官方文档补充 Node.js 要求、core profile、Codex Skills 路径和恢复条件。

- 验证：五个恢复提示场景通过；真实打包安装与 OpenCode 注册检查通过。未执行真实宿主 OpenSpec 初始化。

## [2.1.0] - 2026-10-19

- 新增原生 OpenSpec explore/proposal 代理和六 Skill 全流程入口。
- 新增只读 route 与规范摘要，恢复与归档同时验证上游报告新鲜度。
- 旧 context/planning 报告需重新生成，安装 runtime 后运行 doctor。
- 最终摘要绑定上下文与计划内容，防止修改映射后沿用旧验收。
- 验证：67 项测试，65 通过、0 失败、2 项 Windows 环境跳过；真实打包安装及五个交接压力场景通过，真实宿主调用待验证。

### 从 2.0.0 升级

1. 同步六个 Skill、主 Agent 和共享契约；仅更新仓库检查器不会安装宿主原生 OpenSpec/Superpowers 能力。
2. 备份已有 `bridge/checks/`。安装器不会覆盖不同内容，按 README 的冲突恢复步骤更新运行时后运行 `doctor`。
3. 重新执行 LOAD_CONTEXT 和 PLANNING，生成包含 `spec_fingerprint` 的报告；无需补做探索或方案报告。随后真实重审任务和最终验证，不只替换时间或摘要。
4. `route` 只提供只读阶段建议，不代表阶段已执行；原生能力缺失时代理返回 BLOCKED。

## [2.0.0] - 2026-10-19

本版本完成五轮可靠性检查与修复，保留主 Agent 与四阶段 Skill 架构。报告格式和执行环境有不兼容变化，因此升级主版本号。

### 不兼容变化与迁移

- 运行时现在要求 Node.js 20+ 和 Git；Git Hook 还需要 POSIX sh，Windows 可使用 Git for Windows。
- 阶段报告统一为机器可读 JSON，Task 报告改为 `bridge/reports/<change>/tasks/<task-id>.json`。旧 Markdown 单文件 PASS 不能直接转换为通过凭据，必须重新核对并生成新报告。
- `tasks.md` 的 checkbox 任务必须带唯一稳定 ID。新增和修改需求各自需要完整场景；重命名使用非空、有序的 FROM/TO 映射。
- 指纹改为逐文件字节摘要及带类型的 JSON 记录；旧指纹与旧 PASS 报告失效，归档前必须重新验证。
- PASS 报告须包含完整公共字段、UTC ISO 时间、逐任务引用，且 `issues` 为空。有活跃变更时，纯实现提交也须使用有效的 `Change-Id` trailer。
- 四个 Skill 必须连同共享 `references/workflow.md` 一起安装；复制检查器时须复制完整 `checks/`，不能只复制 Bash wrapper。

从 1.0.0 升级：

1. 保留原规范、实现和验证日志，并记录既有 `core.hooksPath`。若使用旧版手工 Hook 安装，先恢复原 Hook 配置或移除旧的 Bridge 入口，避免串接旧版检查。
2. 更新四个 Skill、主 Agent 说明及共享契约。已有目标 `bridge/checks/` 与新版本不同时，先备份该旧目录；安装器会拒绝覆盖不同内容，不能直接覆盖自定义文件。
3. 从新版本包运行 `node checks/bridge.mjs install --repo <项目根目录>`，再运行 `doctor`。多个 worktree 需要先启用独立 worktree 配置，详见 README。
4. 重新生成逐任务 JSON 报告，运行项目规定的完整验证，再执行 `ready`；不要仅更新旧报告中的时间或摘要。

### 新增

- 跨平台 Node CLI：`format`、`commit`、`fingerprint`、`ready`、`install`、`doctor` 和 `uninstall`；保留 Bash 兼容入口。
- 仓库级安装、诊断、卸载与失败回滚，保留原有 Hook，并支持隔离的 worktree 配置。
- 逐任务报告模板、源内容指纹和归档前证据校验。
- OpenCode 主 Agent 注册、共享契约注入和用户配置保留。
- 回归测试、实际打包解压安装测试，以及逐轮审查记录。

### 修复与加固

- 暂存模式读取 Git index，避免工作区修复掩盖即将提交的无效内容；支持归档、删除、重命名和 linked worktree。
- 明确主规范应用 delta 后的有效要求；任务审查只覆盖当前任务的独立断言，跨任务集成留到最终验收。
- 普通实现失败返回实现者修复并沿用已有授权；审查和验证 Skill 保持只读。
- 逐需求检查场景，拒绝空 WHEN/THEN、孤立场景、空操作章节及错误的 Markdown 围栏边界；合法泛型和 HTML 不再被笼统视作占位符。
- 安装与卸载在修改前拒绝托管路径中的 symlink/junction，避免写入或删除仓库外文件。
- 安装记录验证恢复字段，保存运行时 SHA-256；验证 Hook 独立检查完整性，损坏或清空的 CLI 不再无声通过。
- 原 Hook 先执行，再检查最终暂存区或提交消息；保留其他 Hook、用户目录路径及 POSIX 禁用语义。
- 拒绝用任意历史归档关联当前实现提交；修复 Claude 插件清单的 `repository` 字段类型。

### 验证与已知边界

- 最终代码审查执行 53 项测试：51 通过、0 失败，2 项因 Windows 平台或文件 symlink 权限条件跳过；实际打包解压、已安装 CLI、真实 Git Hook、语法与差异检查通过。
- 第 4、5 轮连续未发现新的具体 P0/P1/P2 问题。详细过程见 `docs/audit/2026-10-19-review.md`。
- 真实宿主会话、Linux/macOS 和 Node 20 环境尚未运行。报告结构及新鲜度检查不能证明任意 Agent 证据的真实性，也不能拦截外部归档入口。

## [1.0.0] - 2026-10-19

- 初始版本：OpenSpec–Superpowers 主 Agent、四阶段 Skill、Bash 格式及提交消息检查、Git Hook 模板和多宿主插件清单。

[2.1.1]: https://github.com/carlylelu/sdd-tdd-bridge-skills/compare/b3daf54...main
[2.1.0]: https://github.com/carlylelu/sdd-tdd-bridge-skills/compare/fa7899b...b3daf54
[2.0.0]: https://github.com/carlylelu/sdd-tdd-bridge-skills/compare/aabc26d...fa7899b
[1.0.0]: https://github.com/carlylelu/sdd-tdd-bridge-skills/commit/aabc26d
