# 变更工作流

## Purpose

变更工作流是 superSpec 的变更生命周期管理能力，为 spec 的变更过程提供从创建到归档的完整流程管控。每个变更以 proposal.md 描述变更意图、以 tasks.md 跟踪具体任务，通过 draft、in-progress、review、done、archived 五个状态的有序流转确保变更过程的可控性和可追溯性。该能力支持任务的添加与完成追踪、变更 delta 向主 spec 的同步合并，以及已完成变更的归档保存，使团队能够以结构化方式管理 spec 的演进过程。

## Requirements

### Requirement: 变更创建

系统 SHALL 支持创建变更提案，每个变更提案包含 proposal.md 和 tasks.md 两个文件，分别描述变更意图和变更任务。

#### Scenario: 正常流程-创建一个完整的变更提案

Given 用户需要对现有 spec 进行一次变更
When 用户创建变更提案
Then 系统 SHALL 生成 proposal.md 文件，包含变更的标题、描述和关联的 spec 路径
And 系统 SHALL 生成 tasks.md 文件，包含初始的空任务列表
And 系统 SHALL 将变更提案的初始状态设为 draft

#### Scenario: 异常场景-变更提案的目标 spec 不存在

Given 用户尝试创建一个变更提案，但指定的目标 spec 路径在项目中不存在
When 用户提交变更提案创建请求
Then 系统 SHALL 拒绝创建变更提案
And 系统 SHALL 输出错误信息指出目标 spec 未找到
And 系统 SHALL 不生成任何文件

#### Scenario: 边界条件-同一 spec 同时存在多个变更提案

Given 用户对同一个 spec 已有一个 draft 状态的变更提案
When 用户尝试创建第二个针对同一 spec 的变更提案
Then 系统 SHALL 允许创建第二个变更提案
And 系统 SHALL 为第二个变更提案分配独立的标识符
And 系统 SHALL 在 proposal.md 中标记该变更与其他并行变更的关系

### Requirement: 状态流转

系统 MUST 支持 draft、in-progress、review、done、archived 五种状态的有序流转，每个状态转换都有明确的触发条件和前置检查。

#### Scenario: 正常流程-从 draft 流转到 in-progress

Given 一个变更提案处于 draft 状态，其 tasks.md 中至少包含一个任务
When 用户将变更状态更新为 in-progress
Then 系统 SHALL 将变更状态从 draft 更新为 in-progress
And 系统 SHALL 记录状态变更的时间戳

#### Scenario: 正常流程-从 review 流转到 done

Given 一个变更提案处于 review 状态，其 tasks.md 中所有任务已完成
When 用户将变更状态更新为 done
Then 系统 SHALL 将变更状态从 review 更新为 done
And 系统 SHALL 记录状态变更的时间戳

#### Scenario: 异常场景-从 draft 直接跳转到 done

Given 一个变更提案处于 draft 状态
When 用户尝试将变更状态直接更新为 done，跳过 in-progress 和 review
Then 系统 SHALL 拒绝该状态转换
And 系统 SHALL 输出错误信息指出不合法的状态跳转
And 系统 SHALL 列出从当前状态可达的合法目标状态

#### Scenario: 边界条件-从 archived 状态尝试再次流转

Given 一个变更提案已处于 archived 状态
When 用户尝试将变更状态更新为 in-progress
Then 系统 SHALL 拒绝该状态转换
And 系统 SHALL 输出错误信息指出已归档的变更不可再修改
And 系统 SHALL 建议用户创建新的变更提案

### Requirement: 任务管理

系统 SHALL 支持在 tasks.md 中添加、完成和列出任务，每个任务有明确的状态和描述。

#### Scenario: 正常流程-添加并完成一个任务

Given 一个变更提案的 tasks.md 中当前没有任务
When 用户添加一个描述为"修改 Purpose 段落"的任务
Then 系统 SHALL 在 tasks.md 中新增该任务条目，状态为 pending
When 用户将该任务标记为完成
Then 系统 SHALL 将任务状态从 pending 更新为 done
And 系统 SHALL 记录任务完成的时间戳

#### Scenario: 异常场景-添加空描述的任务

Given 用户尝试添加一个描述为空字符串的任务
When 用户提交任务添加请求
Then 系统 SHALL 拒绝添加该任务
And 系统 SHALL 输出错误信息指出任务描述不能为空

#### Scenario: 边界条件-列出大量任务

Given 一个变更提案的 tasks.md 中包含 50 个任务，部分已完成、部分待处理
When 用户请求列出所有任务
Then 系统 SHALL 返回全部 50 个任务的列表
And 每个任务 SHALL 显示其描述、当前状态和完成时间（如已完成）
And 系统 SHALL 按状态分组显示，待处理任务优先于已完成任务

### Requirement: 变更同步

系统 MUST 支持将变更的 delta 合并到主 spec，确保变更内容被正确应用到目标 spec 中。

#### Scenario: 正常流程-将单个变更同步到主 spec

Given 一个变更提案处于 done 状态，其包含一个有效的 Delta spec
When 用户执行变更同步操作
Then 系统 SHALL 读取变更中的 Delta spec
And 系统 SHALL 将 Delta 操作合并到目标主 spec
And 系统 SHALL 生成更新后的主 spec 文件
And 系统 SHALL 记录同步操作的时间戳和变更内容摘要

#### Scenario: 异常场景-变更的 Delta spec 存在校验错误

Given 一个变更提案处于 done 状态，但其 Delta spec 存在格式校验错误
When 用户执行变更同步操作
Then 系统 SHALL 拒绝执行同步
And 系统 SHALL 输出错误信息指出 Delta spec 的校验失败原因
And 系统 SHALL 建议用户先修正 Delta spec 再重新同步

#### Scenario: 边界条件-多个变更同步到同一主 spec

Given 两个变更提案（变更 A 和变更 B）都处于 done 状态，且都针对同一个主 spec
When 用户依次执行变更 A 和变更 B 的同步操作
Then 系统 SHALL 先将变更 A 的 Delta 合并到主 spec
And 系统 SHALL 再将变更 B 的 Delta 合并到变更 A 合并后的结果上
And 最终的主 spec SHALL 包含两个变更的所有修改内容

### Requirement: 变更归档

系统 SHALL 支持将已完成的变更归档保存，归档后的变更保留完整的变更记录但不再参与活跃的工作流。

#### Scenario: 正常流程-归档一个已完成的变更

Given 一个变更提案处于 done 状态，其所有任务已完成且 Delta 已同步到主 spec
When 用户执行归档操作
Then 系统 SHALL 将变更状态从 done 更新为 archived
And 系统 SHALL 将变更的 proposal.md、tasks.md 和 Delta spec 移动到归档目录
And 系统 SHALL 在归档记录中保留变更的创建时间、完成时间和归档时间

#### Scenario: 异常场景-尝试归档未完成的变更

Given 一个变更提案处于 in-progress 状态，其 tasks.md 中仍有未完成的任务
When 用户执行归档操作
Then 系统 SHALL 拒绝归档操作
And 系统 SHALL 输出错误信息指出只有 done 状态的变更才能被归档
And 系统 SHALL 列出当前未完成的任务数量

#### Scenario: 边界条件-归档后查询历史变更

Given 项目中存在 10 个已归档的变更提案
When 用户请求查询历史变更列表
Then 系统 SHALL 返回全部 10 个已归档变更的列表
And 每个变更 SHALL 显示其标题、关联的 spec 路径、完成时间和归档时间
And 系统 SHALL 按归档时间倒序排列，最近归档的变更排在最前
