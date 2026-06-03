# XML 标签约束系统

## Purpose

superSpec 的 SKILL.md 文件目前依赖纯自然语言指令来约束 AI 行为，但 AI 模型在长上下文中容易忽略或曲解这些指令。需要引入一套标准化的 XML 标签作为硬性约束机制，使关键规则具有机器可解析的语义，确保 AI 在技能执行过程中严格遵守不可协商的行为边界。这套标签系统将作为 superSpec 所有技能文件的基础设施，为 HARD-GATE、EXTREMELY-IMPORTANT、SUBAGENT-STOP 和 CHECKLIST 等约束提供统一的定义和解析规范。

## Requirements

### Requirement: 标签集合定义

系统 SHALL 定义以下四种标准 XML 标签，每种标签具有明确的语义和优先级：HARD-GATE（硬性门控，违反即终止）、EXTREMELY-IMPORTANT（不可协商规则，必须遵守）、SUBAGENT-STOP（子代理跳过标记，指示子代理忽略当前技能）、CHECKLIST（强制检查清单，执行前必须逐项完成）。

#### Scenario: 标签在 SKILL.md 中被正确识别

Given 一个 SKILL.md 文件包含 `<HARD-GATE>禁止在 main 分支开发</HARD-GATE>` 标签
When 解析器读取该文件
Then 解析器 SHALL 识别出一个 HARD-GATE 标签，其内容为"禁止在 main 分支开发"，且优先级为最高级别

#### Scenario: 文件中包含未知标签

Given 一个 SKILL.md 文件包含 `<UNKNOWN-TAG>某些内容</UNKNOWN-TAG>` 标签
When 解析器读取该文件
Then 解析器 SHALL 报告一个 WARNING 级别的问题，指出 UNKNOWN-TAG 是未定义的标签类型，同时继续解析文件中的其他已知标签

#### Scenario: 标签内容为空

Given 一个 SKILL.md 文件包含 `<HARD-GATE></HARD-GATE>` 标签
When 解析器读取该文件
Then 解析器 SHALL 报告一个 ERROR 级别的问题，指出 HARD-GATE 标签的内容不能为空，因为空的门控标签没有实际约束意义

### Requirement: 标签格式规范

每个 XML 标签 MUST 遵循严格的格式规范：标签必须使用大写字母和连字符命名，必须有对应的闭合标签，标签内容不能为空白字符，标签不得嵌套相同类型的标签。

#### Scenario: 标签格式完全正确

Given 一个 SKILL.md 文件包含 `<EXTREMELY-IMPORTANT>你必须运行校验命令</EXTREMELY-IMPORTANT>`
When 格式验证器检查该标签
Then 验证器 SHALL 确认该标签格式合法，包括命名规范、闭合标签存在、内容非空

#### Scenario: 缺少闭合标签

Given 一个 SKILL.md 文件包含 `<HARD-GATE>禁止跳过校验` 但没有对应的 `</HARD-GATE>`
When 格式验证器检查该标签
Then 验证器 SHALL 报告一个 ERROR 级别的问题，指出 HARD-GATE 标签缺少闭合标签，并提供标签开始的行号以便定位

#### Scenario: 同类型标签嵌套

Given 一个 SKILL.md 文件包含 `<HARD-GATE>外层内容 <HARD-GATE>内层内容</HARD-GATE> 外层结尾</HARD-GATE>`
When 格式验证器检查该标签
Then 验证器 SHALL 报告一个 ERROR 级别的问题，指出 HARD-GATE 标签不得嵌套相同类型的标签，因为嵌套会导致约束语义歧义

### Requirement: 标签行为约束

技能执行引擎 SHALL 根据标签类型施加对应的行为约束：遇到 HARD-GATE 时必须在满足条件前阻止后续操作，遇到 EXTREMELY-IMPORTANT 时必须将其视为最高优先级指令，遇到 SUBAGENT-STOP 时子代理必须跳过当前技能，遇到 CHECKLIST 时必须逐项检查完成后才能继续。

#### Scenario: HARD-GATE 阻止不满足条件的操作

Given 一个技能文件包含 `<HARD-GATE>在 spec 校验通过前，禁止进入编码阶段</HARD-GATE>`
When AI 尝试在 spec 未校验通过时开始编写代码
Then 执行引擎 SHALL 阻止该操作并提示 AI 必须先完成 spec 校验，直到校验结果为 valid: true 才允许继续

#### Scenario: SUBAGENT-STOP 使子代理跳过技能

Given 一个技能文件包含 `<SUBAGENT-STOP>如果你是作为子智能体被分派来执行特定任务的，跳过此技能。</SUBAGENT-STOP>`
When 一个子代理被派发执行某任务并加载了该技能文件
Then 子代理 SHALL 跳过该技能的执行，不应用该技能中的任何约束和流程，直接执行被分配的具体任务

#### Scenario: CHECKLIST 部分项目未完成

Given 一个技能文件包含一个 CHECKLIST 标签，其中有 5 个检查项，AI 只完成了其中 3 项
When AI 尝试声明任务完成
Then 执行引擎 SHALL 阻止完成声明并列出剩余 2 个未完成的检查项，要求 AI 逐项完成所有检查后才能继续

### Requirement: 与现有 SKILL.md 格式兼容

XML 标签系统 MUST 与现有的 SKILL.md 纯自然语言格式完全兼容，标签可以自由穿插在 Markdown 内容中，不破坏现有的 Markdown 渲染，且不含标签的 SKILL.md 文件仍然可以正常工作。

#### Scenario: 包含标签的 SKILL.md 正常渲染

Given 一个 SKILL.md 文件同时包含 Markdown 标题、列表、代码块和 XML 标签
When 在 Markdown 渲染器中查看该文件
Then XML 标签 SHALL 作为行内元素或块级元素正常显示，不破坏周围的 Markdown 结构，整体文档仍然可读

#### Scenario: 不含任何标签的 SKILL.md 正常工作

Given 一个 SKILL.md 文件只包含纯 Markdown 内容，没有任何 XML 标签
When 技能执行引擎加载该文件
Then 引擎 SHALL 正常解析该文件并执行技能逻辑，不因为缺少标签而报错或拒绝执行

#### Scenario: 标签出现在代码块内部

Given 一个 SKILL.md 文件的 Markdown 代码块内部包含 `<HARD-GATE>示例文本</HARD-GATE>`
When 解析器读取该文件
Then 解析器 SHALL 不将代码块内的内容识别为真正的标签约束，因为代码块内的文本是示例代码而非实际指令

### Requirement: 标签校验集成

superspec 的校验工具 SHALL 支持对 SKILL.md 文件中的 XML 标签进行格式和语义校验，校验结果以 JSON 格式输出，包含标签类型、位置、内容和问题描述。

#### Scenario: 校验包含合法标签的文件

Given 一个 SKILL.md 文件包含 2 个格式正确的 HARD-GATE 标签和 1 个 EXTREMELY-IMPORTANT 标签
When 运行 `superspec validate-skill <file>` 命令
Then 校验工具 SHALL 输出 `{"valid": true, "tags": 3, "issues": []}` 表示所有标签格式和语义均合法

#### Scenario: 校验包含格式错误标签的文件

Given 一个 SKILL.md 文件包含一个未闭合的 `<CHECKLIST>` 标签
When 运行校验命令
Then 校验工具 SHALL 输出 `{"valid": false, "issues": [{"level": "ERROR", "tag": "CHECKLIST", "line": 15, "message": "标签缺少闭合标签"}]}` 并以非零退出码退出

#### Scenario: 校验空文件

Given 一个空的 SKILL.md 文件
When 运行校验命令
Then 校验工具 SHALL 输出 `{"valid": true, "tags": 0, "issues": []}` 因为空文件不包含任何标签，不存在格式错误
