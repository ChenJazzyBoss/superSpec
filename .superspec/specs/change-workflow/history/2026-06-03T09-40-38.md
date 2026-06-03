# Change Workflow

## Purpose

superSpec 当前仅支持 spec 的生成与校验，缺少完整的变更生命周期管理能力。用户在实际开发中需要对 spec 进行有计划的修改，但目前没有标准化的流程来追踪这些变更。本功能旨在实现 propose - tasks - apply - sync - archive 的端到端变更工作流，让每一次 spec 变更都可追溯、可审计、可回滚，从而保障 spec 在项目演进过程中始终保持一致性和完整性。

## Requirements

### Requirement: 创建变更提案

系统 SHALL 支持用户通过 propose 命令创建变更提案，自动生成 proposal.md 和 tasks.md 文件，并将变更状态初始化为 draft。

#### Scenario: 成功创建变更提案

Given 用户处于一个已初始化的 superSpec 项目中
When 用户执行 propose 命令并提供变更标题和描述
Then 系统在 .superspec/changes/ 目录下创建以变更 ID 命名的子目录，包含 proposal.md 和 tasks.md，变更状态设为 draft

#### Scenario: 项目未初始化时创建提案

Given 用户处于一个未执行过 init 的目录中
When 用户尝试执行 propose 命令
Then 系统拒绝创建提案并返回错误信息，提示用户需要先初始化项目

#### Scenario: 变更标题包含特殊字符

Given 用户提供包含斜杠、空格或中文的变更标题
When 用户执行 propose 命令
Then 系统将标题规范化为合法的目录名，同时在 proposal.md 中保留原始标题

### Requirement: 管理变更任务列表

系统 SHALL 支持在 tasks.md 中定义变更的具体任务项，每个任务项 MUST 包含明确的完成标准，并支持任务状态的追踪更新。

#### Scenario: 添加和完成任务

Given 用户已创建一个处于 draft 状态的变更提案
When 用户编辑 tasks.md 添加多个任务项，随后逐项标记为完成
Then 系统能够识别每个任务的完成状态，并在所有任务完成后提示用户可以进入下一阶段

#### Scenario: tasks.md 格式错误

Given 用户编辑的 tasks.md 中任务项格式不符合规范（如缺少完成标准）
When 系统解析 tasks.md
Then 系统报告格式错误并指出具体行号，要求用户修正后才能继续

#### Scenario: 空任务列表

Given 用户创建了变更提案但 tasks.md 中没有任何任务项
When 用户尝试将变更状态推进到 in-progress
Then 系统拒绝状态变更并提示至少需要定义一个任务项

### Requirement: 实施变更并追踪进度

系统 SHALL 支持 apply 命令来按 tasks.md 中的任务项逐项实施变更，并实时更新变更进度。

#### Scenario: 逐项实施变更

Given 变更处于 in-progress 状态且 tasks.md 中有多个待完成任务
When 用户完成一个任务并标记为 done，然后执行 apply 命令
Then 系统更新进度信息，记录已完成和剩余任务数量，并在 proposal.md 中同步更新状态

#### Scenario: 跳过未完成任务直接 apply

Given tasks.md 中仍有未完成的任务项
When 用户尝试执行 apply 命令将变更推进到 review 阶段
Then 系统拒绝操作并列出所有未完成的任务，要求用户完成所有任务或显式标记为跳过

#### Scenario: 并发修改冲突

Given 两个用户同时对同一个变更的不同任务进行修改
When 双方都尝试执行 apply 命令
Then 系统检测到冲突并提示用户进行手动合并，避免数据丢失

### Requirement: 同步变更到主 spec

系统 SHALL 支持 sync 命令将已通过审核的变更合并到主 spec 文件中，合并过程 MUST 保留变更历史记录。

#### Scenario: 成功同步变更

Given 变更处于 review 状态且所有任务已完成
When 用户执行 sync 命令
Then 系统将变更内容合并到对应的主 spec 文件中，变更状态更新为 done，并在主 spec 中添加变更记录引用

#### Scenario: 合并冲突检测

Given 变更修改的 spec 区域在变更创建后被其他变更修改过
When 用户执行 sync 命令
Then 系统检测到合并冲突，展示冲突详情并要求用户手动解决后重新同步

#### Scenario: 同步未审核的变更

Given 变更仍处于 in-progress 状态
When 用户尝试执行 sync 命令
Then 系统拒绝同步操作并提示变更必须先进入 review 状态

### Requirement: 归档已完成的变更

系统 SHALL 支持 archive 命令将状态为 done 的变更归档保存，归档后的变更 MUST 保持可查询但不可修改。

#### Scenario: 成功归档变更

Given 变更状态为 done 且已同步到主 spec
When 用户执行 archive 命令
Then 系统将变更目录移至 .superspec/archive/ 目录，变更状态更新为 archived，并生成归档摘要

#### Scenario: 归档未完成的变更

Given 变更状态为 in-progress 或 review
When 用户尝试执行 archive 命令
Then 系统拒绝归档操作并提示变更必须处于 done 状态才能归档

#### Scenario: 查询已归档的变更

Given 存在多个已归档的变更
When 用户执行查询命令搜索历史变更
Then 系统返回所有归档变更的列表，包含变更标题、归档时间和影响的 spec 文件

### Requirement: 变更状态流转管理

系统 SHALL 强制执行变更状态流转规则，状态流转路径为 draft - in-progress - review - done - archived，任何不合法的状态跳转 MUST 被拒绝。

#### Scenario: 正常状态流转

Given 变更处于 draft 状态
When 用户依次执行 start、apply、sync、archive 命令
Then 变更状态按 draft → in-progress → review → done → archived 顺序正确流转

#### Scenario: 非法状态跳转

Given 变更处于 draft 状态
When 用户尝试直接执行 sync 命令跳过中间状态
Then 系统拒绝操作并返回错误信息，说明当前状态不允许该操作以及合法的下一步操作

#### Scenario: 状态回退

Given 变更处于 review 状态但发现需要修改
When 用户请求将状态回退到 in-progress
Then 系统允许状态回退，但必须记录回退原因，并重置相关任务的完成状态
