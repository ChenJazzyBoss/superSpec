# Spec 生成

## Purpose

generate-spec 是 superSpec 将用户自然语言需求转化为结构化 spec 文件的核心能力。当用户描述一个功能需求时，系统将其分解为 Purpose、Requirements、Scenarios 三层结构，按照 spec-template.md 的格式自动生成规范的 spec 文件，并在生成后立即执行双层校验确保质量。该能力使用户无需手动编写符合规范的 spec，大幅降低 spec 驱动开发的门槛，同时通过自动校验和修正循环保证每份生成的 spec 都满足结构和内容的双重质量标准。

<!-- DIAGRAM:flowchart -->

## Requirements

### Requirement: 需求分解

系统 SHALL 将用户的需求描述分解为 Purpose、Requirements、Scenarios 三层结构，确保生成的 spec 具有清晰的层次关系和完整的语义覆盖。

#### Scenario: 正常流程-单一功能需求的完整分解

Given 用户提供一段描述单一功能需求的文本，包含功能目标和若干具体要求
When 系统执行需求分解
Then 系统 SHALL 生成包含一个 Purpose 段落、多个 Requirement 条目、每个 Requirement 下包含至少一个 Scenario 的三层结构 spec

#### Scenario: 异常场景-需求描述过于简短

Given 用户提供的需求描述不足 20 个字符，信息量不足以推断完整的需求结构
When 系统执行需求分解
Then 系统 SHALL 向用户反馈需求描述信息不足，请求补充更多细节，而非生成残缺的 spec

#### Scenario: 边界条件-需求描述包含多个独立功能

Given 用户提供的需求描述中包含两个或多个相互独立的功能需求
When 系统执行需求分解
Then 系统 SHALL 将每个独立功能分解为单独的 Requirement 条目，所有 Requirement 共享同一个 Purpose 段落，Purpose 中说明这些功能的整体目标

### Requirement: 模板遵循

系统 MUST 按照 spec-template.md 的格式生成 spec 文件，确保输出的 spec 文件结构与模板定义完全一致，包括标题层级、注释格式、字段顺序等。

#### Scenario: 正常流程-生成符合模板的 spec 文件

Given 用户提供一段完整的需求描述
When 系统生成 spec 文件
Then 系统 SHALL 输出的 spec 文件包含与 spec-template.md 一致的结构：一级标题、Purpose 段落、Requirements 段落（每个 Requirement 含 Scenario 子段落），且使用 Given/When/Then 格式描述场景

#### Scenario: 异常场景-模板文件缺失

Given 项目中 spec-template.md 文件不存在或无法读取
When 系统尝试生成 spec 文件
Then 系统 SHALL 输出明确的错误信息，指出模板文件缺失，并终止生成流程

#### Scenario: 边界条件-需求内容超出模板预设结构

Given 用户提供的需求描述中包含模板未覆盖的维度（如非功能性需求、性能约束等）
When 系统生成 spec 文件
Then 系统 SHALL 在保持模板基本结构的前提下，将额外维度合理融入 Purpose 或 Requirement 的描述文本中，不破坏模板的整体格式

### Requirement: 自动校验

系统 SHALL 在生成 spec 后自动运行校验，确保 spec 通过双层校验（结构校验和规则引擎校验），未经校验的 spec 不得输出为最终结果。

#### Scenario: 正常流程-生成的 spec 一次通过校验

Given 用户提供一段高质量的需求描述
When 系统生成 spec 并自动运行校验
Then 系统 SHALL 输出校验通过的 spec 文件，并在输出中附带校验报告（valid 为 true）

#### Scenario: 异常场景-生成的 spec 未通过结构校验

Given 系统生成的 spec 文件因内部错误导致缺少 scenarios 字段
When 系统自动运行校验
Then 系统 SHALL 检测到结构校验失败，不将该 spec 作为最终输出，转而进入修正循环

#### Scenario: 边界条件-校验报告中仅包含 INFO 级别问题

Given 系统生成的 spec 文件结构完整但存在概述长度不足等 INFO 级别建议
When 系统自动运行校验
Then 系统 SHALL 将 spec 视为校验通过（valid 为 true），将 INFO 问题作为附注信息随 spec 一起输出

### Requirement: 修正循环

系统 MUST 支持校验失败后自动修正并重新校验的循环，直到校验通过或达到最大修正次数，确保最终输出的 spec 满足质量标准。

#### Scenario: 正常流程-一次修正后通过校验

Given 系统生成的 spec 文件首次校验发现 1 个 ERROR 级别问题（如需求缺少 SHALL 关键词）
When 系统进入修正循环
Then 系统 SHALL 自动修正该问题（如在需求文本中补充 SHALL 关键词），重新运行校验，输出修正后校验通过的 spec 文件

#### Scenario: 异常场景-多次修正后仍未通过校验

Given 系统生成的 spec 文件经过最大修正次数（如 3 次）后仍存在 ERROR 级别问题
When 系统达到最大修正次数
Then 系统 SHALL 终止修正循环，向用户输出当前版本的 spec 文件和最后一次校验报告，由用户决定后续处理方式

#### Scenario: 边界条件-修正过程中引入新问题

Given 系统在修正一个 WARNING 问题时，修改内容触发了另一个 ERROR 级别问题
When 系统重新运行校验
Then 系统 SHALL 在下一轮修正中处理新引入的 ERROR 问题，确保修正循环能够处理问题之间的级联影响

#### Scenario: 边界条件-修正循环中用户中断

Given 系统正在进行自动修正循环（尚未达到最大修正次数）
When 用户主动中断修正过程
Then 系统 SHALL 立即终止修正循环，输出当前版本的 spec 文件和最新一次的校验报告
