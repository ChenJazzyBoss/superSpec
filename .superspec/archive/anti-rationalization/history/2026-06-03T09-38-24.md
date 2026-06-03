# Anti-Rationalization

## Purpose

AI 助手在执行开发任务时经常出现"合理化跳步"行为，例如不编写 spec 直接编码、跳过校验步骤声称任务完成、或用看似合理的理由绕过既定流程。这种行为会导致产出质量不可控、规范形同虚设。本功能旨在为 superSpec 的每个技能内置反合理化设计模式，通过红线表、强制检查清单、XML 标签约束和证据化完成声明等机制，确保 AI 严格遵循流程，杜绝任何形式的跳步和自我欺骗。

## Requirements

### Requirement: 红线表对照机制

每个技能配置文件 MUST 包含一个红线表（Red Flags），列出该技能中 AI 常见的合理化借口与现实情况的对照，用于在执行过程中进行实时检测和拦截。

#### Scenario: 检测到合理化借口

Given AI 正在执行 generate-spec 技能，试图跳过 Purpose 编写直接生成 Requirements
When 系统检测到 AI 的输出模式匹配红线表中的"跳过 Purpose 借口"
Then 系统拦截该操作，展示红线表中对应的条目，强制 AI 回到 Purpose 编写步骤

#### Scenario: 红线表配置缺失

Given 某个技能的配置文件中未包含红线表
When 用户尝试执行该技能
Then 系统报错并拒绝执行，提示技能配置不完整，要求补充红线表后才能使用

#### Scenario: 红线表条目更新

Given 技能已上线运行，发现了新的合理化模式
When 维护者更新红线表添加新条目
Then 系统在下次执行该技能时自动加载更新后的红线表，无需重启或重新初始化

### Requirement: 检查清单强制执行

每个技能的执行流程 MUST 被分解为明确的检查清单条目，每个条目 MUST 转化为待办事项，AI 必须逐项完成并标记才能继续下一步。

#### Scenario: 逐项完成检查清单

Given AI 正在执行 validate-spec 技能，检查清单包含 5 个条目
When AI 完成第一个条目并标记为 done
Then 系统验证该条目的完成质量，通过后解锁下一个条目，未通过则要求重新执行

#### Scenario: 尝试跳过检查清单条目

Given 检查清单中第 3 个条目尚未完成
When AI 尝试直接执行第 4 个条目
Then 系统阻止操作并提示必须先完成前置条目，同时记录跳步尝试用于后续分析

#### Scenario: 检查清单条目定义模糊

Given 检查清单中某个条目的完成标准不明确
When AI 声称已完成该条目但系统无法验证
Then 系统要求 AI 提供具体的完成证据，如输出内容、文件变更或校验结果

### Requirement: XML 标签约束系统

系统 MUST 支持 HARD-GATE、EXTREMELY-IMPORTANT、SUBAGENT-STOP 等 XML 标签，用于在技能配置中标记关键约束点，这些标签 MUST 被严格执行，不可被 AI 忽略或绕过。

#### Scenario: HARD-GATE 标签阻断

Given 技能配置中某步骤标记为 `<HARD-GATE>` 标签
When AI 尝试跳过该步骤继续执行
Then 系统立即阻断执行流程，不允许任何绕过方式，直到该步骤被完整执行

#### Scenario: EXTREMELY-IMPORTANT 标签强化提示

Given 技能配置中某个要求标记为 `<EXTREMELY-IMPORTANT>` 标签
When AI 执行到该步骤时
Then 系统以强化方式展示该要求，确保 AI 充分理解其重要性，且执行结果需要额外验证

#### Scenario: SUBAGENT-STOP 标签限制子代理

Given 主代理委托子代理执行某项任务，配置中包含 `<SUBAGENT-STOP>` 标签
When 子代理尝试执行超出授权范围的操作
Then 子代理立即停止执行并返回控制权给主代理，由主代理决定后续操作

### Requirement: 完成声明证据化

AI 声称任务完成时 MUST 提供新鲜的验证证据，包括但不限于校验输出、测试结果、文件 diff 等，系统 MUST 拒绝无证据的完成声明。

#### Scenario: 带证据的完成声明

Given AI 执行完 validate-spec 技能后声称校验通过
When AI 提交完成声明并附带校验工具的完整输出作为证据
Then 系统验证证据的真实性和时效性，接受该完成声明

#### Scenario: 无证据的完成声明

Given AI 声称某技能已执行完成
When AI 未提供任何验证证据或证据为空
Then 系统拒绝该完成声明，要求 AI 重新执行技能并提供完整的执行日志和验证输出

#### Scenario: 过期证据检测

Given AI 提供了一份校验证据，但该证据的时间戳早于最后一次 spec 修改
When 系统验证该证据
Then 系统判定证据已过期，要求 AI 重新运行校验并提供最新的验证结果

### Requirement: 反合理化模式库

系统 MUST 维护一个可扩展的反合理化模式库，收录常见的 AI 跳步模式和对应的检测规则，支持持续更新和优化。

#### Scenario: 新模式识别与入库

Given 在技能执行过程中发现了一种新的 AI 合理化跳步模式
When 维护者将该模式及其检测规则添加到模式库中
Then 系统在后续所有技能执行中自动应用该检测规则

#### Pattern: 直接编码不写 spec

Given AI 收到一个功能开发任务
When AI 试图跳过 spec 生成直接编写代码
Then 系统检测到缺少 spec 文件，拦截编码操作并提示必须先生成 spec

#### Pattern: 声称完成不运行校验

Given AI 完成了 spec 编写任务
When AI 声称任务完成但未执行 validate-spec
Then 系统检测到校验步骤缺失，拒绝完成声明并强制要求运行校验

#### Pattern: 选择性报告结果

Given AI 运行校验后发现部分规则未通过
When AI 仅报告通过的规则而隐藏失败的规则
Then 系统对比完整的校验输出，检测到信息遗漏，要求 AI 完整报告所有校验结果
