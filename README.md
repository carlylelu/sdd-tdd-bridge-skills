# sdd-tdd-bridge · OpenSpec-Superpowers 衔接 Plugin（强校验版）

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](#)

> 主 Agent + 4 阶段 Skill + 确定性检查脚本 + Git Hooks + 双重验证，把 OpenSpec（管"做什么"）和 Superpowers（管"怎么做"）衔接起来，带强校验。

---

## 目录

- [这是什么](#这是什么)
- [为什么需要这个插件](#为什么需要这个插件)
- [设计架构：主 Agent + 阶段 Skill + 确定性检查](#设计架构主-agent--阶段-skill--确定性检查)
- [包含的 Skill](#包含的-skill)
- [快速开始](#快速开始)
  - [方式 A：Claude Code Plugin 安装](#方式-a-claude-code-plugin-安装)
  - [方式 B：OpenCode / CodeFree-O Plugin 安装](#方式-b-opencode--codefree-o-plugin-安装)
  - [方式 C：Codex Skill 安装](#方式-c-codex-skill-安装)
  - [方式 D：复制整个包到项目级 skills 目录](#方式-d复制整个包到项目级-skills-目录)
- [环境依赖](#环境依赖)
- [核心阶段流程](#核心阶段流程)
- [主 Agent 定义](#主-agent-定义)
- [确定性检查脚本](#确定性检查脚本)
- [Git Hooks](#git-hooks)
- [与原版 bridge 的差异](#与原版-bridge-的差异)
- [项目结构](#项目结构)
- [License](#license)

---

## 这是什么

**sdd-tdd-bridge** 是 OpenSpec 和 Superpowers 两个 AI 编程框架的衔接插件，带强校验机制。

OpenSpec 管"做什么"（规范驱动开发），Superpowers 管"怎么做"（TDD + 代码审查 + 验证）。两个框架不会自动配合——你需要一个衔接层。本插件就是那个衔接层，并且通过确定性检查脚本、Git Hooks 和结构化返回协议，把原来靠 AI 自觉遵守的软约束升级为硬约束。

---

## 为什么需要这个插件

装了 OpenSpec 和 Superpowers 之后，你会遇到 7 个坑：

| 坑 | 现象 | 本插件的防护机制 |
|----|------|----------------|
| 1 | propose 生成的方案和需求对不上 | 需要人先 explore（不在插件范围） |
| 2 | AI 多做了你没要求的功能 | proposal 排除范围检查（确定性脚本） |
| 3 | tasks 和 plan 粒度不匹配 | 场景转测试用例 + 粒度转换规则 |
| 4 | 实现方式和 design.md 不一致 | 强制加载 design.md（确定性脚本检查存在性） |
| 5 | 审查不检查规范合规 | bridge-spec-compliance-check-skill |
| 6 | 只做 verify 或只做代码审查 | 双重验证步骤强制两者都做 |
| 7 | archive 前没跑全量测试 | archive 前强制 Superpowers verification |

---

## 设计架构：主 Agent + 阶段 Skill + 确定性检查

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OpenSpec-Superpowers 衔接流程                      │
│                                                                     │
│  主 Agent（agents/bridge_agent.md）                                  │
│    │                                                                │
│    ├─ LOAD_CONTEXT ──── bridge-load-context-skill                    │
│    │    ├─ 读取 openspec/specs/ 主规范                               │
│    │    ├─ 读取 openspec/changes/<变更名>/ 变更产物                   │
│    │    ├─ 调用 checks/openspec-format-check（确定性）                │
│    │    └─ 跳过 Superpowers brainstorming                            │
│    │                                                                │
│    ├─ PLANNING ─────── bridge-planning-skill                         │
│    │    ├─ design.md → Superpowers planning 输入                     │
│    │    ├─ specs/ 场景 → TDD 测试用例                                │
│    │    └─ tasks.md → Superpowers plan 粒度                          │
│    │                                                                │
│    ├─ IMPLEMENT_TASK ─ bridge-spec-compliance-check-skill（每Task）  │
│    │    ├─ 检查场景覆盖                                              │
│    │    ├─ 检查 design.md 架构决策遵守                                │
│    │    ├─ 检查 proposal.md 排除范围                                  │
│    │    └─ 检查主规范未被违反                                         │
│    │                                                                │
│    └─ DUAL_VERIFY ──── bridge-dual-verify-skill                      │
│         ├─ OpenSpec /opsx:verify（规范维度）                         │
│         ├─ Superpowers verification（代码维度）                      │
│         └─ 两个都通过 → /opsx:archive                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 包含的 Skill

| Skill 目录 | 用途 | 触发时机 |
|-----------|------|---------|
| [`bridge-load-context-skill/`](skills/bridge-load-context-skill/) | 加载 openspec/specs/ 主规范和 openspec/changes/ 变更文档，执行 OpenSpec 产物格式检查 | OpenSpec explore + propose 完成后 |
| [`bridge-planning-skill/`](skills/bridge-planning-skill/) | 把 design.md 作为 Superpowers planning 输入，把 specs/ 场景转 TDD 测试用例，把 tasks.md 拆成 plan 粒度 | LOAD_CONTEXT 通过后 |
| [`bridge-spec-compliance-check-skill/`](skills/bridge-spec-compliance-check-skill/) | 审查实现是否符合 OpenSpec 规范（主规范 + delta + design + 排除范围） | 每个 Task 实现完成后 |
| [`bridge-dual-verify-skill/`](skills/bridge-dual-verify-skill/) | 执行双重验证：OpenSpec verify + Superpowers verification，两个都通过才能 archive | 全部 Task 实现完成后 |

---

## 快速开始

本插件支持四类 AI 编码助手：

| 工具 | 推荐方式 | 章节 |
|------|---------|------|
| Claude Code | 方式 A：Plugin 安装 | [跳转](#方式-a-claude-code-plugin-安装) |
| OpenCode / CodeFree-O | 方式 B：Plugin 安装 | [跳转](#方式-b-opencode--codefree-o-plugin-安装) |
| Codex | 方式 C：复制到 `.codex/skills/` | [跳转](#方式-c-codex-skill-安装) |
| 任意工具 | 方式 D：复制到 skills 目录 | [跳转](#方式-d复制整个包到项目级-skills-目录) |

---

### 方式 A：Claude Code Plugin 安装

```bash
# 注册 GitHub 仓库为 marketplace
/plugin marketplace add carlylelu/sdd-tdd-bridge-skills

# 安装 plugin
/plugin install sdd-tdd-bridge@sdd-tdd-bridge
```

安装完成后 4 个 skill 会以 `bridge-load-context-skill`、`bridge-planning-skill`、`bridge-spec-compliance-check-skill`、`bridge-dual-verify-skill` 名称注册，主 Agent 以 `bridge_agent` 注册。

---

### 方式 B：OpenCode / CodeFree-O Plugin 安装

**OpenCode**：在 `opencode.json` 的 `plugin` 数组中添加：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "sdd-tdd-bridge",
    "git+https://github.com/carlylelu/sdd-tdd-bridge-skills.git"
  ]
}
```

**CodeFree-O**：

```bash
codefree-o plugin sdd-tdd-bridge              # 项目级安装
codefree-o plugin sdd-tdd-bridge -g           # 全局安装
codefree-o plugin git+https://github.com/carlylelu/sdd-tdd-bridge-skills.git -g
```

#### 本地安装

如果你已经把本包解压到项目目录中，OpenCode / CodeFree-O 启动时会自动加载 `.opencode/plugins/sdd-tdd-bridge.js`，通过 config hook 把 `skills/` 目录注册到 `config.skills.paths`。

---

### 方式 C：Codex Skill 安装

```bash
# Windows (PowerShell)
Copy-Item -Recurse "<sdd-tdd-bridge>\skills\bridge-load-context-skill" ".codex\skills\"
Copy-Item -Recurse "<sdd-tdd-bridge>\skills\bridge-planning-skill" ".codex\skills\"
Copy-Item -Recurse "<sdd-tdd-bridge>\skills\bridge-spec-compliance-check-skill" ".codex\skills\"
Copy-Item -Recurse "<sdd-tdd-bridge>\skills\bridge-dual-verify-skill" ".codex\skills\"

# macOS / Linux
cp -r /path/to/sdd-tdd-bridge/skills/bridge-load-context-skill /your-project/.codex/skills/
cp -r /path/to/sdd-tdd-bridge/skills/bridge-planning-skill /your-project/.codex/skills/
cp -r /path/to/sdd-tdd-bridge/skills/bridge-spec-compliance-check-skill /your-project/.codex/skills/
cp -r /path/to/sdd-tdd-bridge/skills/bridge-dual-verify-skill /your-project/.codex/skills/
```

同时复制主 Agent、检查脚本和 Hook：

```bash
# 主 Agent
cp -r /path/to/sdd-tdd-bridge/agents /your-project/.codex/agents/

# 确定性检查脚本
mkdir -p /your-project/bridge/checks
cp /path/to/sdd-tdd-bridge/checks/* /your-project/bridge/checks/

# Git Hooks
mkdir -p /your-project/.githooks
cp /path/to/sdd-tdd-bridge/hooks/* /your-project/.githooks/
git -C /your-project config core.hooksPath .githooks
```

---

### 方式 D：复制整个包到项目级 skills 目录

```bash
# Windows (PowerShell)
Copy-Item -Recurse "<sdd-tdd-bridge>\skills\bridge-load-context-skill" ".claude\skills\"
Copy-Item -Recurse "<sdd-tdd-bridge>\skills\bridge-planning-skill" ".claude\skills\"
Copy-Item -Recurse "<sdd-tdd-bridge>\skills\bridge-spec-compliance-check-skill" ".claude\skills\"
Copy-Item -Recurse "<sdd-tdd-bridge>\skills\bridge-dual-verify-skill" ".claude\skills\"
Copy-Item -Recurse "<sdd-tdd-bridge>\agents" ".claude\agents\"

# macOS / Linux
cp -r /path/to/sdd-tdd-bridge/skills/bridge-load-context-skill /your-project/.claude/skills/
cp -r /path/to/sdd-tdd-bridge/skills/bridge-planning-skill /your-project/.claude/skills/
cp -r /path/to/sdd-tdd-bridge/skills/bridge-spec-compliance-check-skill /your-project/.claude/skills/
cp -r /path/to/sdd-tdd-bridge/skills/bridge-dual-verify-skill /your-project/.claude/skills/
cp -r /path/to/sdd-tdd-bridge/agents /your-project/.claude/agents/
```

同时复制 `checks/` 和 `hooks/` 到项目根目录的 `bridge/checks/` 和 `.githooks/`。

---

## 环境依赖

### OpenSpec

本插件依赖 OpenSpec 已完成 explore 和 propose 阶段，`openspec/changes/` 下存在变更目录且包含 `proposal.md`、`design.md`、`tasks.md`。

### Superpowers

本插件依赖 Superpowers 的 TDD 实现能力（test-driven-development skill）和验证能力（verification-before-completion skill）。本插件不替代 Superpowers 的执行，只负责衔接编排。

### 本地 Git Hooks

- `.githooks/pre-commit` → 调用 `bridge/checks/openspec-format-check`
- `.githooks/commit-msg` → 调用 `bridge/checks/commit-msg-check`

手动配置：

```bash
git config core.hooksPath .githooks
```

---

## 核心阶段流程

| 阶段 | 前置条件 | 调用的 Skill | 本地自查 | 阶段终点 |
|------|---------|-------------|---------|---------|
| `LOAD_CONTEXT` | OpenSpec explore + propose 完成 | `bridge-load-context-skill` | OpenSpec 产物格式检查 | 加载规范上下文，跳过 brainstorming |
| `PLANNING` | LOAD_CONTEXT 通过 | `bridge-planning-skill` | 场景覆盖完整性检查 | 生成 Superpowers planning 输入 |
| `IMPLEMENT_TASK` | PLANNING 通过，Superpowers TDD 实现 Task | `bridge-spec-compliance-check-skill` | 规范合规检查 | 当前 Task 规范合规通过 |
| `DUAL_VERIFY` | 全部 Task 实现完成 | `bridge-dual-verify-skill` | OpenSpec verify + Superpowers verification | 两个验证都通过 |
| `ARCHIVE` | 双重验证通过 | OpenSpec `/opsx:archive` | — | 归档变更，更新主规范 |

---

## 主 Agent 定义

主 Agent 定义在 [`agents/bridge_agent.md`](agents/bridge_agent.md)，是衔接流程的统一对话入口和单阶段编排者。

### 核心职责

- 确认 OpenSpec explore 和 propose 已完成
- 调用 `bridge-load-context-skill` 加载规范上下文
- 跳过 Superpowers brainstorming，直接进入 planning
- 调用 `bridge-planning-skill` 转换 OpenSpec 产物为 Superpowers planning 输入
- 每个 Task 实现完成后调用 `bridge-spec-compliance-check-skill` 审查规范合规
- 全部 Task 完成后调用 `bridge-dual-verify-skill` 执行双重验证
- 两个验证都通过后才能执行 OpenSpec archive

### 禁止事项（14 条）

1. 在 OpenSpec explore 和 propose 未完成时进入衔接流程
2. 跳过规范上下文加载直接实现
3. 不读 design.md 就开始 planning
4. 把 specs/ 场景转测试用例时遗漏场景
5. 只做 verify 或只做代码审查（必须两个都做）
6. archive 前没跑 Superpowers verification
7. 检查失败后未经用户确认自动修改
8. 设置后台自动修复、重试或轮询
9. 伪造检查、测试、Commit 或验证结果
10. 使用 `--no-verify` 绕过 Hook
11. 在 OpenSpec verify 未通过时执行 archive
12. 在 Superpowers verification 测试未通过时执行 archive
13. 将功能名称或工作项 ID 当作 OpenSpec 变更名
14. 修改已通过的 OpenSpec 产物以规避下游问题

---

## 确定性检查脚本

| 脚本 | 用途 |
|------|------|
| [`checks/openspec-format-check`](checks/openspec-format-check) | OpenSpec 产物格式检查：变更目录基础文件存在性、proposal 范围/排除范围章节、design 技术方案、tasks 任务清单、specs Given/When/Then 场景、占位符 |
| [`checks/commit-msg-check`](checks/commit-msg-check) | Commit Message 检查：首行格式 `<type>(<scope>): <description>`、Change-Id Trailer、变更目录存在性 |

---

## Git Hooks

| Hook | 用途 |
|------|------|
| [`hooks/pre-commit`](hooks/pre-commit) | 暂存区涉及 `openspec/changes/` 时调用 `openspec-format-check` |
| [`hooks/commit-msg`](hooks/commit-msg) | 调用 `commit-msg-check` 检查 Commit Message 格式 |

---

## 与原版 bridge 的差异

| 维度 | 原版 bridge（41行 SKILL.md） | 本插件（强校验版） |
|------|----------------------------|-------------------|
| 架构 | 1 个 SKILL.md 包含 9 步 | 主 Agent + 4 阶段 Skill |
| 确定性检查 | ❌ 无 | ✅ 2 个 bash 脚本 |
| Git Hook | ❌ 无 | ✅ 2 个 Hook |
| 返回协议 | ❌ 无 | ✅ YAML 结构化返回 |
| 报告落盘 | ❌ 无 | ✅ 4 个阶段报告 |
| 禁止事项 | ❌ 无 | ✅ 14 条 |
| 强度 | 100% 靠 AI 自觉 | 产物格式硬检查 + 流程纪律软约束 |

**强度天花板**：本插件能达到"产物格式硬检查 + 流程纪律软约束"，达不到 sdd-dev-manager 的"行为硬检查 + MR 人工卡点"。因为 bridge 不控制 OpenSpec CLI 和 Superpowers Skill 的执行行为，只控制衔接编排。

---

## 项目结构

```
sdd-tdd-bridge-skills/
├── README.md                          # 本文件
├── LICENSE                            # MIT 许可证
├── package.json                       # npm 包元数据
├── .gitignore
├── .claude-plugin/                    # Claude Code plugin 配置
│   ├── plugin.json
│   └── marketplace.json
├── .codefree-plugin/                  # CodeFree plugin 配置
│   └── plugin.json
├── .opencode/                         # OpenCode plugin 配置
│   ├── .gitignore
│   ├── package.json
│   └── plugins/
│       └── sdd-tdd-bridge.js
├── agents/                            # 主 Agent 定义
│   └── bridge_agent.md
├── skills/                            # 4 个阶段 Skill
│   ├── bridge-load-context-skill/
│   ├── bridge-planning-skill/
│   ├── bridge-spec-compliance-check-skill/
│   └── bridge-dual-verify-skill/
├── checks/                            # 确定性检查脚本
│   ├── openspec-format-check
│   └── commit-msg-check
└── hooks/                             # Git Hooks
    ├── pre-commit
    └── commit-msg
```

---

## License

[MIT](LICENSE)
