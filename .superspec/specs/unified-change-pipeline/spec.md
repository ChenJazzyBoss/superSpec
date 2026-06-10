# 统一变更管道与多路径路由

## Purpose

重构 superSpec 的变更生命周期，将当前分散的 generate-spec（新功能）和 update-spec（增量修改）统一为基于 change 目录的变更模型。借鉴 OpenSpec 的 proposal → delta-spec → apply 流程和 cospowers 的中央路由器思想，实现统一变更管道。新功能和增量修改走同一条管道，区别仅在 delta-spec 阶段的内容类型（ADDED vs MODIFIED/REMOVED/RENAMED）。同时为 brainstorm 技能增加中央路由器能力，根据用户意图自动分发到不同路径深度。

## Requirements

### Requirement: 统一变更目录结构

系统 SHALL 在 .superspec/changes/<name>/ 下支持完整的变更生命周期文件结构，包括 proposal.md、specs/ 目录和 plan.md。

#### Scenario: 创建新变更目录

Given 用户通过 brainstorm 或 generate-spec 开始一个新变更
When 系统创建变更目录
Then 系统在 .superspec/changes/<name>/ 下创建目录结构
And 包含 proposal.md 文件
And 包含 specs/ 子目录用于存放 delta spec

#### Scenario: 变更目录中存放 delta spec

Given 一个变更目录已创建
When 用户通过 generate-spec 或 update-spec 生成 spec 内容
Then delta spec 写入 .superspec/changes/<name>/specs/<capability>/spec.md
And delta spec 使用 Markdown 格式，包含 ADDED/MODIFIED/REMOVED/RENAMED 标记
And 不直接修改主 spec（.superspec/specs/）

#### Scenario: 变更目录中的文件完整性

Given 一个进入实施阶段的变更
When 查看变更目录内容
Then 目录中包含 proposal.md（变更提案）
And 目录中包含 specs/ 子目录（delta spec）
And 目录中可选包含 plan.md（实现计划）

### Requirement: Proposal 变更提案

系统 SHALL 在变更目录中生成 proposal.md 文件，记录变更的原因、范围和影响的 capability。

#### Scenario: 生成 proposal 提案

Given 用户通过 brainstorm 确认了一个需求
When 系统创建变更目录
Then 生成 proposal.md 包含以下字段：
- Why：为什么做这个变更
- What Changes：具体改什么
- Capabilities：影响哪些 capability（新建的 / 修改的）
- Impact：影响范围

#### Scenario: Proposal 中标注新 capability 和已有 capability

Given 用户需求涉及新增功能和修改已有功能
When 生成 proposal
Then proposal 中区分 New Capabilities 和 Modified Capabilities
And 每个 capability 标注对应的 spec 名称（kebab-case）

### Requirement: Delta Spec Markdown 格式

系统 SHALL 支持在变更目录下用 Markdown 格式编写 delta spec，替代当前直接修改主 spec 的方式。

#### Scenario: 新功能生成 ADDED 类型的 delta spec

Given 用户需求是创建新功能
When 生成 delta spec
Then delta spec 位于 .superspec/changes/<name>/specs/<capability>/spec.md
And 内容以 "## ADDED Requirements" 开头
And 包含 Purpose 和完整的 Requirement + Scenario 定义

#### Scenario: 增量修改生成 MODIFIED/REMOVED 类型的 delta spec

Given 用户需求是修改已有功能
When 生成 delta spec
Then delta spec 标记为 "## MODIFIED Requirements" 或 "## REMOVED Requirements"
And MODIFIED 包含完整的需求内容（不是差异补丁）
And REMOVED 包含 Reason 和 Migration 说明

#### Scenario: Delta spec 通过校验

Given 一个 delta spec 已生成
When 运行校验
Then 系统执行 dry-run 合并到主 spec
And 校验合并后的完整 spec 是否通过（不实际写入主 spec）
And 校验通过才允许进入下一阶段

### Requirement: 中央路由器

系统 SHALL 在 brainstorm 阶段根据用户意图评估复杂度，自动分发到不同深度的路径。

#### Scenario: 新功能或增量修改走统一变更路径

Given 用户提出一个新功能或需求变更
When brainstorm 评估复杂度
Then 系统创建变更目录并生成 proposal
And 引导用户进入 delta-spec → validate-spec → write-plan 流程

#### Scenario: 排障请求走排障路径

Given 用户报告一个 Bug 或测试失败
When brainstorm 识别为排障场景
Then 系统跳过 proposal 和 spec 阶段
And 直接路由到 debug → verify 流程

#### Scenario: 简单需求简化流程

Given 用户提出一个简单需求（如配置变更、文案修改）
When brainstorm 评估为低复杂度
Then 系统仍走统一变更路径但可跳过 design 阶段
And 必须经过 proposal → delta-spec → validate 流程（不可跳过）

### Requirement: Archive 增强

系统 SHALL 在 archive 时将变更目录下的 delta spec 合并到主 spec，并校验合并结果。

#### Scenario: Archive 时 apply delta 到主 spec

Given 一个变更已完成实施和验证
When 执行 archive
Then 系统读取变更目录下的 delta spec
And 按操作顺序（RENAMED → REMOVED → MODIFIED → ADDED）合并到主 spec
And 合并后校验主 spec 通过（valid: true）
And 将变更目录移到 archive/

#### Scenario: Archive 合并失败时阻断

Given archive 合并 delta 到主 spec 后校验失败
When 校验结果显示 errors > 0
Then 系统阻断归档并报告错误
And 不修改主 spec 文件
And 变更目录保持不变

#### Scenario: Archive 新 capability 时创建主 spec

Given 变更包含全新的 capability（主 spec 不存在）
When archive 合并 delta
Then 系统在 .superspec/specs/<capability>/ 下创建新的 spec.md
And 校验新创建的 spec 通过
