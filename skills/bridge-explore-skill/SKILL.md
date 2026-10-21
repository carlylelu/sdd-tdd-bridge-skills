---
name: bridge-explore-skill
description: 在需要代理 OpenSpec 原生Explore工序时使用；对应 EXPLORE 阶段。
---

# Bridge Explore

先读取同包 `../bridge-load-context-skill/references/workflow.md`，遵守用户授权和单阶段停止边界。

先按共享契约“检查器路径绑定与只读预检”从当前加载的完整插件包解析 BRIDGE_CLI，确认绝对 PROJECT_ROOT，首次需要 Bridge CLI 检查时执行 runtime（纯对话探索不必为此安装或配置项目）；不要假定项目内已有 bridge/checks，也不要求先安装 Hook。所有命令替换为已绑定的真实路径，缺失或失败不得用 OpenSpec validate 替代。

发现宿主实际可用的 openspec-explore 或对应原生探索入口并调用。不要把聊天 slash 命令当 shell 命令，不自行仿制 OpenSpec。缺失原生能力返回 BLOCKED 和恢复条件。

探索原始想法、现有代码与主规范、约束、候选方案和未决问题。默认只读，不实现业务代码，不自动创建变更目录或方案文件。只有用户授权捕获讨论结果时，才通过原生能力记录产物。未命名变更可保持 change_id=null，在对话中交接，不为报告发明目录。

已有明确设计和完整产物时跳过重复探索；用户明确要求 explore 时仍尊重意图。产品范围或架构取舍需要用户决定，已有授权不重复询问。仅探索的请求到此停止；端到端授权且需求已明确时交接 PROPOSAL，传递目标、边界、方案和待决问题。探索报告可选，不作为已有产物进入下游的前置条件。

原生能力缺失时，必须按共享契约的“OpenSpec 原生能力缺失时的恢复指引”区分 CLI 安装与项目初始化，并向用户输出当前宿主的具体 `openspec init --tools … --profile core` 命令、目标项目根目录和重载后恢复步骤。已有可用 CLI 不要求重复安装，版本过旧则先升级；不只报告 BLOCKED，也不默认提供底层 CLI 绕过方案。
