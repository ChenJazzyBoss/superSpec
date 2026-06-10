# 自适应路由改进

## Purpose

为 brainstorm 中央路由器增加复杂度评估逻辑，根据变更的规模和类型自动选择合适的路径深度。简单新功能直接走轻量路径（直接写 specs/），复杂新功能和需求变更走完整路径（change 目录 + delta spec），排障走排障路径。避免简单需求被过度流程化，同时保证复杂变更的审计完整性。

## Requirements

### Requirement: 复杂度评估决策

系统 SHALL 在 brainstorm 阶段根据变更规模评估复杂度，自动选择路径深度。

#### Scenario: 简单新功能走轻量路径

Given 用户提出一个新功能需求
When brainstorm 评估该需求只涉及 1-2 个 requirement 且不涉及已有 spec 的修改
Then 系统选择轻量路径
And 引导用户直接使用 generate-spec 写入 specs/ 目录
And 不创建 change 目录

#### Scenario: 复杂新功能走完整路径

Given 用户提出一个新功能需求
When brainstorm 评估该需求涉及多个 capability 或超过 2 个 requirement
Then 系统选择完整路径
And 引导用户创建 change 目录 + proposal + delta spec

#### Scenario: 需求变更必须走完整路径

Given 用户提出对已有功能的修改需求
When brainstorm 识别为需求变更（涉及已有 spec 的 MODIFIED/REMOVED/RENAMED）
Then 系统强制选择完整路径
And 必须创建 change 目录和 delta spec
And 不允许直接修改主 spec

#### Scenario: 排障走排障路径

Given 用户报告 Bug 或测试失败
When brainstorm 识别为排障场景
Then 系统选择排障路径
And 跳过 spec 相关阶段，直接路由到 debug

### Requirement: 路由决策透明化

系统 SHALL 在路由决策时向用户展示判断依据和推荐路径。

#### Scenario: 展示路由决策

Given brainstorm 完成复杂度评估
When 系统做出路由决策
Then 向用户展示以下信息：评估结果（简单/复杂/增量/排障）、推荐路径、判断依据
And 用户可以确认或调整路由选择

#### Scenario: 用户强制切换路径

Given brainstorm 推荐了某条路径
When 用户明确要求切换到其他路径
Then 系统尊重用户选择
And 按用户指定的路径继续

### Requirement: 轻量路径和完整路径共享下游

系统 SHALL 确保所有路径共享 validate-spec、write-plan、implement、verify、archive 阶段。

#### Scenario: 两条路径的 archive 行为不同但下游一致

Given 一个变更走轻量路径（spec 已在 specs/ 中）
When 执行 archive
Then archive 记录变更历史，不需要 apply delta（因为 spec 已直接写入）

Given 一个变更走完整路径（delta spec 在 change 目录中）
When 执行 archive
Then archive 先 apply delta spec 到主 spec，再记录变更历史

#### Scenario: 下游阶段不受路径选择影响

Given 用户选择了轻量路径或完整路径
When 进入 validate-spec 阶段
Then 两条路径的校验逻辑完全一致（Zod Schema + 规则引擎）
