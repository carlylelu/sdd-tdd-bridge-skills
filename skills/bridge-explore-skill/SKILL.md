---
name: bridge-explore-skill
description: 在需要代理 OpenSpec 原生Explore工序时使用；对应 EXPLORE 阶段。
---

# Bridge Explore

先读取同包 `../bridge-load-context-skill/references/workflow.md`，遵守用户授权和单阶段停止边界。

发现宿主实际可用的 openspec-explore 或对应原生探索入口并调用。不要把聊天 slash 命令当 shell 命令，不自行仿制 OpenSpec。缺失原生能力返回 BLOCKED 和恢复条件。

探索原始想法、现有代码与主规范、约束、候选方案和未决问题。默认只读，不实现业务代码，不自动创建变更目录或方案文件。只有用户授权捕获讨论结果时，才通过原生能力记录产物。未命名变更可保持 change_id=null，在对话中交接，不为报告发明目录。

已有明确设计和完整产物时跳过重复探索；用户明确要求 explore 时仍尊重意图。产品范围或架构取舍需要用户决定，已有授权不重复询问。仅探索的请求到此停止；端到端授权且需求已明确时交接 PROPOSAL，传递目标、边界、方案和待决问题。探索报告可选，不作为已有产物进入下游的前置条件。
