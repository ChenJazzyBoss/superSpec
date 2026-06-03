# 图表生成与嵌入

## Purpose

superSpec 的图表能力为 spec 文档提供可视化表达。在 spec 驱动的开发流程中，纯文本的需求描述往往难以直观呈现任务分解结构、状态流转路径、决策分支逻辑和测试覆盖情况。图表模块从 spec 数据中提取结构化信息，自动生成 4 种 Mermaid 图表（任务分解图、状态流转图、决策点图、测试覆盖矩阵），并将图表嵌入到 Markdown 产物中。生成的图表使用标准 Mermaid 语法，用户可在 VS Code 中直接预览，无需额外工具。该能力同时支持扩展新的图表类型，使团队能够根据自身需求定制可视化维度。

<!-- DIAGRAM:flowchart -->

## Requirements

### Requirement: 图表生成

系统 SHALL 支持从 Spec 数据生成 4 种 Mermaid 图表（任务分解图、状态流转图、决策点图、测试覆盖矩阵）。

#### Scenario: 正常流程-从完整 spec 生成全部 4 种图表

Given 用户提交一份包含 requirements、scenarios 和 test-cases 的完整 spec 文件
When 用户请求生成图表
Then 系统 SHALL 输出 4 个独立的 Mermaid 代码块，分别对应任务分解图（graph TD）、状态流转图（stateDiagram-v2）、决策点图（flowchart）、测试覆盖矩阵（classDiagram），每个代码块包含正确的 Mermaid 语法标记

#### Scenario: 正常流程-从部分 spec 生成适用的图表

Given 用户提交的 spec 文件包含 requirements 和 scenarios 但不包含 test-cases
When 用户请求生成图表
Then 系统 SHALL 生成任务分解图、状态流转图和决策点图，跳过测试覆盖矩阵，并在输出中提示缺少测试数据

#### Scenario: 异常场景-spec 数据不足以生成任何图表

Given 用户提交的 spec 文件仅包含 title 和 overview，不包含 requirements
When 用户请求生成图表
Then 系统 SHALL 不生成任何图表，在输出中报告 spec 数据不足，无法生成图表

#### Scenario: 边界条件-spec 中包含单个 requirement 和单个 scenario

Given 用户提交的 spec 文件包含 1 个 requirement 和 1 个 scenario
When 用户请求生成图表
Then 系统 SHALL 生成有效的 Mermaid 图表，图表中仅包含单个节点和单条边，语法正确且可渲染

#### Scenario: 边界条件-图表内容超过 Mermaid 渲染限制

Given 用户提交的 spec 文件包含 200 个 requirements，生成的任务分解图节点数超过 Mermaid 的推荐上限
When 用户请求生成图表
Then 系统 SHALL 生成图表并在输出中提示图表节点数量较多，可能影响渲染性能

### Requirement: 图表嵌入

系统 MUST 支持将图表嵌入到 Markdown 产物中（占位符替换或追加模式）。

#### Scenario: 正常流程-占位符替换模式嵌入图表

Given Markdown 产物中包含占位符 `<!-- DIAGRAM:flowchart -->`
When 系统执行图表嵌入
Then 系统 SHALL 将占位符替换为对应的 Mermaid 代码块，代码块使用 ```mermaid 围栏标记，替换后 Markdown 文件中不再存在该占位符

#### Scenario: 正常流程-追加模式嵌入图表

Given 用户请求以追加模式将所有图表嵌入到 Markdown 产物末尾
When 系统执行图表嵌入
Then 系统 SHALL 在 Markdown 文件末尾追加所有生成的图表，每个图表前包含二级标题（如 `## 任务分解图`），图表使用 ```mermaid 围栏标记

#### Scenario: 异常场景-占位符未匹配到对应图表类型

Given Markdown 产物中包含占位符 `<!-- DIAGRAM:unknown-type -->`
When 系统执行图表嵌入
Then 系统 SHALL 保留占位符不变，在输出中报告未知的图表类型

#### Scenario: 边界条件-Markdown 产物中存在多个同类型占位符

Given Markdown 产物中包含 3 个 `<!-- DIAGRAM:flowchart -->` 占位符
When 系统执行图表嵌入
Then 系统 SHALL 将每个占位符都替换为相同的 flowchart 图表代码块

#### Scenario: 边界条件-追加模式下 Markdown 文件为空

Given Markdown 产物为空文件（0 字节）
When 系统以追加模式执行图表嵌入
Then 系统 SHALL 在空文件中写入所有生成的图表，文件内容变为包含 Mermaid 代码块的有效 Markdown

### Requirement: 图表类型扩展

系统 SHALL 支持扩展新的图表类型。

#### Scenario: 正常流程-注册并使用新的图表类型

Given 用户定义了一种新的图表类型 "risk-matrix"，包含对应的生成函数和 Mermaid 模板
When 用户注册该图表类型并请求生成 "risk-matrix" 图表
Then 系统 SHALL 将 "risk-matrix" 纳入图表类型列表，使用用户提供的生成函数从 spec 数据中提取信息，输出符合 Mermaid 语法的图表代码块

#### Scenario: 正常流程-扩展图表类型参与嵌入流程

Given 用户已注册自定义图表类型 "risk-matrix"
When Markdown 产物中包含占位符 `<!-- DIAGRAM:risk-matrix -->`
Then 系统 SHALL 识别该占位符，生成对应的图表并替换占位符，行为与内置图表类型一致

#### Scenario: 异常场景-扩展图表类型的生成函数抛出异常

Given 用户注册的自定义图表类型 "risk-matrix" 的生成函数在执行时抛出异常
When 用户请求生成该类型图表
Then 系统 SHALL 捕获异常，不生成该类型图表，在输出中报告生成失败的原因，继续处理其他图表类型

#### Scenario: 边界条件-注册与内置图表类型同名的扩展类型

Given 用户尝试注册名为 "flowchart" 的自定义图表类型，该名称与内置图表类型冲突
When 用户注册该图表类型
Then 系统 SHALL 拒绝注册并在输出中报告名称冲突，提示用户使用不同的类型名称

### Requirement: VS Code 预览

系统 MUST 生成标准 Mermaid 语法，VS Code 可直接预览。

#### Scenario: 正常流程-生成的图表在 VS Code 中可渲染

Given 系统生成了一份包含 Mermaid 图表的 Markdown 文件
When 用户在 VS Code 中打开该 Markdown 文件并使用预览功能
Then 系统 SHALL 确保每个 Mermaid 代码块使用 ```mermaid 围栏标记，语法符合 Mermaid 官方规范，VS Code 的 Markdown 预览能够正确渲染图表

#### Scenario: 正常流程-不同图表类型均支持 VS Code 预览

Given 系统生成了任务分解图、状态流转图、决策点图和测试覆盖矩阵 4 种图表
When 用户在 VS Code 中预览包含这些图表的 Markdown 文件
Then 系统 SHALL 确保 4 种图表均使用各自对应的 Mermaid 图表类型声明（graph、stateDiagram、flowchart、classDiagram），VS Code 均能正确渲染

#### Scenario: 异常场景-生成的 Mermaid 语法存在错误

Given 系统在生成图表过程中产生了包含语法错误的 Mermaid 代码（如缺少分号或括号不匹配）
When 用户在 VS Code 中预览该图表
Then VS Code 将显示渲染错误而非图表，系统 SHOULD 在生成阶段进行基本的语法校验以减少此类情况

#### Scenario: 边界条件-图表中包含特殊字符

Given spec 数据中包含 Mermaid 保留字符（如方括号、引号、冒号）
When 系统生成 Mermaid 图表
Then 系统 SHALL 对特殊字符进行转义或使用引号包裹，确保生成的语法在 VS Code 中可正确渲染
