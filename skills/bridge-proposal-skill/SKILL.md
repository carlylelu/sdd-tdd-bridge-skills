---
name: bridge-proposal-skill
description: 在需要代理 OpenSpec 原生Proposal工序时使用；对应 PROPOSAL 阶段。
---

# Bridge Proposal

先读取同包 `../bridge-load-context-skill/references/workflow.md`，遵守用户授权和单阶段停止边界。

先按共享契约“检查器路径绑定与只读预检”从当前加载的完整插件包解析 BRIDGE_CLI，确认绝对 PROJECT_ROOT，并执行 runtime；不要假定项目内已有 bridge/checks，也不要求先安装 Hook。所有命令替换为已绑定的真实路径，缺失或失败不得用 OpenSpec validate 替代。

发现宿主实际可用的 openspec-propose 或对应原生方案入口；新变更委托其创建 schema 要求的产物，已有部分产物则使用宿主实际支持的 update/continue/ff 能力补齐。保留用户草稿和已有决定，不静默覆盖冲突内容。缺少原生能力返回 BLOCKED，不自行仿制生成器，不把 slash 命令交给 shell。

交接探索结论、需求边界、已有产物及缺失项。由 OpenSpec 按依赖生成或更新 proposal、design、tasks 和 delta specs。只处理上游产物，不实现业务代码。遇到尚未授权的产品或架构取舍，展示具体选项请用户决定；普通补齐不重复审批。

完成后运行 `node "<BRIDGE_CLI>" format --repo "<PROJECT_ROOT>" --change <change>`，审查产物语义和用户意图。文件存在和格式 PASS 不能代替语义审查。记录真实原生入口、输出、文件清单及 spec-fingerprint 结果；可保存 proposal-report.json。仅方案请求到此停止；端到端授权时进入 LOAD_CONTEXT。修改上游后历史下游报告保留但失效，必须重新解析和规划，禁止只替换旧报告摘要。

原生能力缺失时，必须按共享契约的“OpenSpec 原生能力缺失时的恢复指引”区分 CLI 安装与项目初始化，并向用户输出当前宿主的具体 `openspec init --tools … --profile core` 命令、目标项目根目录和重载后恢复步骤。已有可用 CLI 不要求重复安装，版本过旧则先升级；不只报告 BLOCKED，也不默认提供底层 CLI 绕过方案。
