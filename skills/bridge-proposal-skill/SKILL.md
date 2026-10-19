---
name: bridge-proposal-skill
description: 在需要代理 OpenSpec 原生Proposal工序时使用；对应 PROPOSAL 阶段。
---

# Bridge Proposal

先读取同包 `../bridge-load-context-skill/references/workflow.md`，遵守用户授权和单阶段停止边界。

发现宿主实际可用的 openspec-propose 或对应原生方案入口；新变更委托其创建 schema 要求的产物，已有部分产物则使用宿主实际支持的 update/continue/ff 能力补齐。保留用户草稿和已有决定，不静默覆盖冲突内容。缺少原生能力返回 BLOCKED，不自行仿制生成器，不把 slash 命令交给 shell。

交接探索结论、需求边界、已有产物及缺失项。由 OpenSpec 按依赖生成或更新 proposal、design、tasks 和 delta specs。只处理上游产物，不实现业务代码。遇到尚未授权的产品或架构取舍，展示具体选项请用户决定；普通补齐不重复审批。

完成后运行 `node bridge/checks/bridge.mjs format --repo . --change <change>`，审查产物语义和用户意图。文件存在和格式 PASS 不能代替语义审查。记录真实原生入口、输出、文件清单及 spec-fingerprint 结果；可保存 proposal-report.json。仅方案请求到此停止；端到端授权时进入 LOAD_CONTEXT。修改上游后历史下游报告保留但失效，必须重新解析和规划，禁止只替换旧报告摘要。
