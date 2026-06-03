# 图表嵌入集成

## Purpose

superSpec v4 建立了完整的 Mermaid 图表生成系统（diagram-integration.ts），支持任务分解图和依赖关系图的自动生成。但在实际使用中发现，模板系统未预留图表占位符，技能文件未强制要求输出包含图表，校验规则未检测图表缺失，导致图表系统建好后无人使用。本次修复旨在打通图表生成器与技能流水线的全链路集成，使图表自动嵌入到所有产物中，消除用户手动干预的需求。

## Requirements

### Requirement: 模板图表占位符

模板系统 SHALL 在所有产物模板中包含图表占位符标记 `<!-- DIAGRAM:type -->`，其中 type 为图表类型标识（task-breakdown 或 dependency-graph），占位符 MUST 出现在模板的固定位置，确保生成产物时图表能被正确插入。

#### Scenario: 模板包含图表占位符的正常流程

Given 一个 spec 模板文件 `spec-template.md` 包含占位符 `<!-- DIAGRAM:task-breakdown -->`
When generate-spec 技能使用该模板生成 spec
Then 生成的 spec 文件 SHALL 在占位符位置被替换为实际的 Mermaid 图表代码，图表展示该 spec 的任务分解结构

#### Scenario: 模板缺少图表占位符的异常场景

Given 一个旧版 spec 模板文件不包含任何 `<!-- DIAGRAM:xxx -->` 占位符
When generate-spec 技能使用该模板生成 spec
Then 技能 SHALL 在 spec 末尾追加图表章节，包含 `## Diagram` 标题和 Mermaid 图表代码，同时输出 WARNING 提示模板缺少占位符

#### Scenario: 占位符类型不匹配的边界条件

Given 一个 plan 模板文件包含 `<!-- DIAGRAM:task-breakdown -->` 占位符，但 write-plan 技能需要生成的是依赖关系图
When write-plan 技能使用该模板生成计划
Then 技能 SHALL 将占位符替换为 `<!-- DIAGRAM:dependency-graph -->` 对应的 Mermaid 图表，并 WARNING 提示模板中的占位符类型与实际图表类型不匹配

### Requirement: generate-spec 技能图表输出

generate-spec 技能 MUST 在输出 spec 文件时自动调用图表生成器嵌入任务分解图，图表 SHALL 展示 spec 中各 Requirement 的层级关系和依赖，技能 MUST 不需要用户手动触发图表生成。

#### Scenario: 正常生成包含图表的 spec

Given 用户通过 generate-spec 技能创建一个新的 spec 文件
When 技能完成 spec 内容编写后执行图表嵌入步骤
Then 技能 SHALL 自动调用 diagram-integration.ts 生成任务分解 Mermaid 图，将图表嵌入 spec 的 Diagram 章节，且图表中的节点与 spec 中的 Requirement 一一对应

#### Scenario: 图表生成器不可用的异常场景

Given diagram-integration.ts 文件不存在或模块导入失败
When generate-spec 技能尝试调用图表生成器
Then 技能 SHALL 仍然输出完整的 spec 文件，在 Diagram 章节放置占位符注释 `<!-- DIAGRAM:task-breakdown - 生成失败：图表模块不可用 -->`，同时输出 ERROR 级别日志但不中断 spec 生成流程

#### Scenario: spec 包含零个 Requirement 的边界条件

Given 一个 spec 框架文件尚处于初始阶段，不包含任何 Requirement
When generate-spec 技能尝试生成任务分解图
Then 技能 SHALL 在 Diagram 章节输出一个空的 Mermaid 图（仅包含根节点），并 WARNING 提示 spec 尚无 Requirement，图表将在 Requirement 添加后自动丰富

### Requirement: write-plan 技能图表输出

write-plan 技能 MUST 在输出计划文件时自动调用图表生成器嵌入依赖关系图，图表 SHALL 展示各任务之间的前后依赖关系和关键路径，技能 MUST 不需要用户手动触发图表生成。

#### Scenario: 正常生成包含图表的计划

Given 用户通过 write-plan 技能基于一个已校验的 spec 创建实施计划
When 技能完成计划内容编写后执行图表嵌入步骤
Then 技能 SHALL 自动调用 diagram-integration.ts 生成依赖关系 Mermaid 图，将图表嵌入计划的 Dependency Graph 章节，且图表中的箭头方向表示任务依赖方向

#### Scenario: 计划中存在循环依赖的异常场景

Given 计划中的任务 A 依赖任务 B，任务 B 依赖任务 C，任务 C 又依赖任务 A
When write-plan 技能尝试生成依赖关系图
Then 技能 SHALL 在图表中标记循环依赖的节点为红色样式（`style` 指令），并输出 ERROR 指出循环依赖的具体路径，同时在计划文件中添加 WARNING 注释

#### Scenario: 计划只有一个任务的边界条件

Given 一个计划只包含一个独立任务，没有依赖关系
When write-plan 技能尝试生成依赖关系图
Then 技能 SHALL 输出一个仅包含单节点的 Mermaid 图，并 WARNING 提示当前计划只有一个任务，依赖关系图将在任务增加后展示更多结构

### Requirement: validate-spec 图表校验

validate-spec 技能 MUST 检查 spec 文件是否包含图表，校验规则 SHALL 检测产物中是否缺少图表并给出 WARNING 级别提示，校验结果 MUST 包含图表相关的检查项。

#### Scenario: spec 包含有效图表的正常流程

Given 一个 spec 文件包含 `<!-- DIAGRAM:task-breakdown -->` 占位符且对应位置有 Mermaid 图表代码
When validate-spec 技能执行校验
Then 校验结果 SHALL 包含 `"diagram": {"present": true, "type": "task-breakdown", "valid": true}` 字段，整体校验不因图表而增加 WARNING

#### Scenario: spec 完全缺少图表的异常场景

Given 一个 spec 文件不包含任何 `<!-- DIAGRAM:xxx -->` 占位符或 Mermaid 图表代码
When validate-spec 技能执行校验
Then 校验工具 SHALL 输出 WARNING 级别提示 `"diagram": {"present": false, "message": "spec 文件缺少图表，请运行 generate-spec 重新生成或手动添加图表"}`，但整体校验结果仍可为 valid（WARNING 不阻断）

#### Scenario: 图表存在但 Mermaid 语法错误的边界条件

Given 一个 spec 文件包含 Mermaid 图表代码但语法有误（如缺少 `graph` 声明行）
When validate-spec 技能执行校验
Then 校验工具 SHALL 输出 WARNING 级别提示指出 Mermaid 语法错误的具体位置和修正建议，`diagram.valid` 字段设为 false

### Requirement: 图表生成器自动调用

图表生成器（diagram-integration.ts）MUST 被 generate-spec 和 write-plan 技能自动调用，调用链路 SHALL 完全自动无需用户手动触发，生成器 MUST 接受 spec 或 plan 的结构化数据作为输入并输出 Mermaid 图表字符串。

#### Scenario: generate-spec 自动调用图表生成器的正常流程

Given generate-spec 技能正在执行且已完成 spec 内容的结构化解析
When 技能进入图表嵌入阶段
Then 技能 SHALL 自动导入 diagram-integration 模块，调用 `generateTaskBreakdownDiagram(specData)` 函数，将返回的 Mermaid 字符串插入 spec 文件的 Diagram 章节

#### Scenario: 图表生成器抛出异常的异常场景

Given diagram-integration 模块的 `generateTaskBreakdownDiagram` 函数因输入数据格式异常而抛出运行时错误
When generate-spec 技能调用图表生成器
Then 技能 SHALL 捕获异常，输出 ERROR 日志包含异常详情，在 Diagram 章节放置降级占位符注释，不中断 spec 文件的整体生成流程

#### Scenario: 技能文件未配置图表生成步骤的边界条件

Given 一个自定义技能文件（非内置 generate-spec）未在流程中配置图表生成步骤
When 该技能执行完毕后生成产物
Then 系统 SHALL 不强制该技能调用图表生成器，但 validate-spec 校验时仍会对缺少图表的产物输出 WARNING，提醒用户手动补充或修改技能配置
