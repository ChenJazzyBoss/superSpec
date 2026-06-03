# XML 标签约束

## Purpose

superSpec 的 XML 标签约束能力为 SKILL.md 文件提供结构化的行为指令机制。在 AI 辅助开发的工作流中，纯文本的指令往往被 AI 模型忽略或误解，导致关键步骤被跳过、校验被省略或子代理未按预期停止。XML 标签通过显式声明的方式，将行为约束编码为机器可解析的标记（HARD-GATE 阻断流程、EXTREMELY-IMPORTANT 强化注意力、SUBAGENT-STOP 终止子代理、CHECKLIST 强制逐项检查），使 AI 在执行技能时能够准确识别并遵守这些约束。该能力包含标签解析、格式验证、行为执行和代码块排除四个环节，确保标签机制既灵活又可靠。

## Requirements

### Requirement: 标签解析

系统 SHALL 解析 SKILL.md 中的 XML 标签（HARD-GATE、EXTREMELY-IMPORTANT、SUBAGENT-STOP、CHECKLIST）。

#### Scenario: 正常流程-解析包含全部 4 种标签的 SKILL.md

Given 一份 SKILL.md 文件中包含 HARD-GATE、EXTREMELY-IMPORTANT、SUBAGENT-STOP 和 CHECKLIST 四种标签，每个标签均有闭合标记和非空内容
When 系统解析该 SKILL.md
Then 系统 SHALL 识别并提取所有标签及其内容，输出包含每种标签的位置（行号）和内容的解析结果

#### Scenario: 正常流程-解析仅包含单一标签类型的 SKILL.md

Given 一份 SKILL.md 文件中仅包含 CHECKLIST 标签，共 3 个实例
When 系统解析该 SKILL.md
Then 系统 SHALL 识别全部 3 个 CHECKLIST 标签，输出包含 3 个条目的解析结果，每个条目包含标签类型、行号和内容

#### Scenario: 异常场景-SKILL.md 中不包含任何 XML 标签

Given 一份 SKILL.md 文件中不包含任何 HARD-GATE、EXTREMELY-IMPORTANT、SUBAGENT-STOP 或 CHECKLIST 标签
When 系统解析该 SKILL.md
Then 系统 SHALL 输出空的标签列表，不产生解析错误

#### Scenario: 边界条件-标签内容包含多行文本

Given 一份 SKILL.md 文件中包含一个 CHECKLIST 标签，其内容跨越 5 行，每行包含一个检查项
When 系统解析该 SKILL.md
Then 系统 SHALL 将标签的完整多行内容作为该标签的解析结果，保留原始换行符

#### Scenario: 边界条件-同一文件中同类型标签出现多次

Given 一份 SKILL.md 文件中包含 2 个 HARD-GATE 标签，分别位于不同段落
When 系统解析该 SKILL.md
Then 系统 SHALL 分别识别并提取 2 个 HARD-GATE 标签，输出中包含 2 个独立条目，每个条目有各自的行号和内容

### Requirement: 格式验证

系统 MUST 验证标签格式（闭合标签、命名规范、非空内容）。

#### Scenario: 正常流程-标签格式完全正确

Given SKILL.md 中一个标签为 `<HARD-GATE>必须完成校验</HARD-GATE>`，开闭标签名称一致，内容非空
When 系统执行格式验证
Then 系统 SHALL 报告该标签格式验证通过，不产生任何格式问题

#### Scenario: 异常场景-标签未闭合

Given SKILL.md 中一个标签为 `<HARD-GATE>必须完成校验`，缺少闭合标签 `</HARD-GATE>`
When 系统执行格式验证
Then 系统 SHALL 输出一条格式错误，指出该标签未闭合，包含标签的行号和类型

#### Scenario: 异常场景-闭合标签名称与开标签不匹配

Given SKILL.md 中一个标签为 `<HARD-GATE>必须完成校验</EXTREMELY-IMPORTANT>`
When 系统执行格式验证
Then 系统 SHALL 输出一条格式错误，指出开闭标签名称不匹配，包含实际的开标签和闭标签名称

#### Scenario: 异常场景-标签内容为空

Given SKILL.md 中一个标签为 `<HARD-GATE></HARD-GATE>`
When 系统执行格式验证
Then 系统 SHALL 输出一条格式错误，指出标签内容不能为空，包含标签的行号和类型

#### Scenario: 边界条件-使用未定义的标签名称

Given SKILL.md 中一个标签为 `<CUSTOM-TAG>自定义内容</CUSTOM-TAG>`，CUSTOM-TAG 不在已知标签列表中
When 系统执行格式验证
Then 系统 SHALL 输出一条警告，指出使用了未定义的标签名称，列出已知的合法标签名称

#### Scenario: 边界条件-标签名称大小写不一致

Given SKILL.md 中一个标签为 `<hard-gate>必须完成校验</hard-gate>`
When 系统执行格式验证
Then 系统 SHALL 输出一条格式错误，指出标签名称应使用大写形式（HARD-GATE），包含实际使用的标签名称

### Requirement: 行为约束

系统 SHALL 根据标签类型执行对应的行为约束（阻断、强化、跳过、检查）。

#### Scenario: 正常流程-HARD-GATE 标签阻断流程

Given SKILL.md 中包含 `<HARD-GATE>必须通过校验</HARD-GATE>` 标签，当前校验结果未通过
When AI 执行到该标签位置
Then 系统 SHALL 阻断后续流程执行，直到 HARD-GATE 的条件被满足，不跳过该检查点

#### Scenario: 正常流程-EXTREMELY-IMPORTANT 标签强化注意力

Given SKILL.md 中包含 `<EXTREMELY-IMPORTANT>输出必须为 JSON 格式</EXTREMELY-IMPORTANT>` 标签
When AI 执行到该标签位置
Then 系统 SHALL 将标签内容作为高优先级指令注入 AI 上下文，确保 AI 在后续输出中遵守该约束

#### Scenario: 正常流程-SUBAGENT-STOP 标签终止子代理

Given SKILL.md 中包含 `<SUBAGENT-STOP>任务已完成，返回结果</SUBAGENT-STOP>` 标签
When 子代理执行到该标签位置
Then 系统 SHALL 终止子代理的执行，将当前结果返回给主代理，子代理不继续执行后续指令

#### Scenario: 正常流程-CHECKLIST 标签强制逐项检查

Given SKILL.md 中包含一个 CHECKLIST 标签，内容包含 5 个检查项
When AI 执行到该标签位置
Then 系统 SHALL 逐项检查每个检查项，输出每项的检查结果（通过/未通过），只有全部检查项通过后才继续执行后续流程

#### Scenario: 异常场景-HARD-GATE 标签的条件始终无法满足

Given SKILL.md 中包含 `<HARD-GATE>外部服务必须返回 200</HARD-GATE>` 标签，但外部服务持续不可用
When AI 反复执行到该标签位置
Then 系统 SHALL 持续阻断流程，每次阻断时输出当前阻断原因，不自动跳过该检查点

#### Scenario: 边界条件-同一位置存在多个不同类型的标签

Given SKILL.md 中连续出现 `<EXTREMELY-IMPORTANT>注意格式</EXTREMELY-IMPORTANT>` 和 `<HARD-GATE>必须通过校验</HARD-GATE>` 两个标签
When AI 执行到该位置
Then 系统 SHALL 先处理 EXTREMELY-IMPORTANT 的强化约束，再处理 HARD-GATE 的阻断检查，两种约束均生效

### Requirement: 代码块排除

系统 MUST 忽略代码块内的标签。

#### Scenario: 正常流程-标签出现在 Markdown 围栏代码块内

Given SKILL.md 中包含一段 Markdown 围栏代码块（```），代码块内的文本包含 `<HARD-GATE>示例</HARD-GATE>`
When 系统解析标签
Then 系统 SHALL 忽略代码块内的标签，不将其纳入标签解析结果，代码块外的同类型标签正常解析

#### Scenario: 正常流程-标签出现在行内代码中

Given SKILL.md 中包含行内代码 `` `<HARD-GATE>示例</HARD-GATE>` ``
When 系统解析标签
Then 系统 SHALL 忽略行内代码中的标签，不将其纳入标签解析结果

#### Scenario: 异常场景-代码块标记不完整导致标签被误解析

Given SKILL.md 中包含一个未闭合的代码块标记（只有开头的 ``` 没有结尾的 ```），后续文本包含 `<HARD-GATE>内容</HARD-GATE>`
When 系统解析标签
Then 系统 SHALL 在代码块标记不完整时仍尝试正确识别代码块边界，对于无法确定是否在代码块内的标签，输出警告提示可能存在未闭合的代码块

#### Scenario: 边界条件-代码块内包含多种标签类型

Given SKILL.md 中一段代码块内同时包含 `<HARD-GATE>`、`<CHECKLIST>` 和 `<SUBAGENT-STOP>` 标签
When 系统解析标签
Then 系统 SHALL 忽略代码块内的所有 3 种标签，解析结果中不包含这些标签，代码块外的标签正常解析

#### Scenario: 边界条件-代码块紧邻标签，标签在代码块之后

Given SKILL.md 中先有一段代码块（包含标签），代码块结束后紧跟一个 `<EXTREMELY-IMPORTANT>` 标签
When 系统解析标签
Then 系统 SHALL 忽略代码块内的标签，正确解析代码块之后的 EXTREMELY-IMPORTANT 标签
