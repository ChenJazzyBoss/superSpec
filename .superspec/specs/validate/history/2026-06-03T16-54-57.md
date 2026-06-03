# Spec 校验

## Purpose

Spec 校验是 superSpec 质量保障的核心能力。当用户创建或修改 spec 文件后，校验系统对 spec 进行双层检查：第一层验证文件结构的完整性（字段类型、必填项是否齐全），第二层通过规则引擎检查业务逻辑质量（是否包含模糊词、场景类型分布是否合理、需求关键词是否规范等）。校验结果以 JSON 报告输出，明确标识每个问题的严重级别和位置，帮助用户快速定位并修复 spec 中的缺陷。该能力确保进入工作流的每一份 spec 都满足结构和内容的双重质量标准。

<!-- DIAGRAM:flowchart -->

## Requirements

### Requirement: 结构校验

系统 SHALL 使用 schema 校验机制检查 spec 文件的结构完整性，验证所有必需字段是否存在、字段类型是否正确、嵌套结构是否符合规范。

#### Scenario: 正常流程-结构完整的 spec 文件

Given 用户提交一份包含 title、overview、requirements 的完整 spec 文件
When 系统执行结构校验
Then 系统 SHALL 报告结构校验通过，不产生 ERROR 级别的结构问题

#### Scenario: 异常场景-缺少必需字段

Given 用户提交的 spec 文件缺少 requirements 字段
When 系统执行结构校验
Then 系统 SHALL 输出至少一条 ERROR 级别的校验问题，指出缺失的字段路径

#### Scenario: 边界条件-字段类型错误

Given 用户提交的 spec 文件中 requirements 字段的值为字符串而非数组
When 系统执行结构校验
Then 系统 SHALL 输出至少一条 ERROR 级别的校验问题，指出字段类型不匹配

#### Scenario: 边界条件-嵌套结构不完整

Given 用户提交的 spec 文件中某个 requirement 缺少 scenarios 数组
When 系统执行结构校验
Then 系统 SHALL 输出至少一条 ERROR 级别的校验问题，指出缺失的嵌套字段路径（如 requirements[0].scenarios）

### Requirement: 规则引擎校验

系统 MUST 使用规则引擎检查 spec 的业务逻辑质量，包括但不限于模糊词检测、场景类型分布检查、需求关键词规范性检查等规则。

#### Scenario: 正常流程-所有规则检查通过

Given 用户提交的 spec 文件结构完整且内容质量合格
When 系统执行规则引擎校验
Then 系统 SHALL 不产生任何 WARNING 或 ERROR 级别的规则违反问题

#### Scenario: 异常场景-检测到模糊词汇

Given 用户提交的 spec 文件中某个 requirement 的文本包含"尽快"、"适当"等模糊词汇
When 系统执行规则引擎校验
Then 系统 SHALL 输出一条 WARNING 级别的校验问题，指出具体包含的模糊词汇

#### Scenario: 异常场景-场景类型分布单一

Given 用户提交的 spec 文件中某个 requirement 的所有场景都属于同一类型（如全部为正常流程）
When 系统执行规则引擎校验
Then 系统 SHALL 输出一条 WARNING 级别的校验问题，指出场景类型单一并建议补充其他类型

#### Scenario: 边界条件-需求缺少强制性关键词

Given 用户提交的 spec 文件中某个 requirement 的文本不包含 SHALL 和 MUST 关键词
When 系统执行规则引擎校验
Then 系统 SHALL 输出一条 ERROR 级别的校验问题，指出需求文本缺少 SHALL 或 MUST 关键词

### Requirement: 三级严重性

系统 SHALL 将校验问题分为 ERROR、WARNING、INFO 三个严重级别，每个级别有明确的语义：ERROR 表示必须修正的阻断性问题，WARNING 表示建议修正的质量问题，INFO 表示仅供参考的改进建议。

#### Scenario: 正常流程-不同级别问题同时存在

Given 用户提交的 spec 文件同时存在结构错误（ERROR）、模糊词（WARNING）和概述过短（INFO）的问题
When 系统完成全部校验
Then 系统 SHALL 将每个问题分配正确的严重级别，summary 中分别统计各级别的问题数量

#### Scenario: 异常场景-仅存在 ERROR 级别问题

Given 用户提交的 spec 文件存在结构校验失败（ERROR 级别）
When 系统完成全部校验
Then 系统 SHALL 将 valid 设为 false，summary 中 errors 数量大于 0

#### Scenario: 边界条件-仅存在 INFO 级别问题

Given 用户提交的 spec 文件仅存在概述长度不足等 INFO 级别的建议
When 系统完成全部校验
Then 系统 SHALL 将 valid 设为 true，summary 中 info 数量大于 0，errors 和 warnings 数量为 0

### Requirement: strict 模式

系统 MUST 支持 strict 模式，在该模式下 WARNING 级别问题也导致校验失败（valid 为 false），使得校验标准更加严格。

#### Scenario: 正常流程-strict 模式下 WARNING 导致失败

Given 用户以 strict 模式提交校验，spec 文件存在模糊词问题（WARNING 级别）但无 ERROR
When 系统完成校验
Then 系统 SHALL 将 valid 设为 false，因为 strict 模式下 WARNING 也视为失败

#### Scenario: 正常流程-strict 模式下无任何问题

Given 用户以 strict 模式提交校验，spec 文件没有任何 ERROR、WARNING、INFO 问题
When 系统完成校验
Then 系统 SHALL 将 valid 设为 true

#### Scenario: 异常场景-非 strict 模式下 WARNING 不导致失败

Given 用户以非 strict 模式（默认模式）提交校验，spec 文件存在 WARNING 但无 ERROR
When 系统完成校验
Then 系统 SHALL 将 valid 设为 true，WARNING 问题记录在 issues 中但不影响校验结果

#### Scenario: 边界条件-strict 模式下同时存在 ERROR 和 WARNING

Given 用户以 strict 模式提交校验，spec 文件同时存在 ERROR 和 WARNING 问题
When 系统完成校验
Then 系统 SHALL 将 valid 设为 false，issues 中包含所有 ERROR 和 WARNING 级别问题

### Requirement: 校验报告输出

系统 SHALL 输出 JSON 格式的校验报告，报告包含 valid（布尔值，表示校验是否通过）、issues（数组，包含所有校验问题的详细信息）、summary（对象，统计各级别问题数量）三个字段。

#### Scenario: 正常流程-校验通过时的报告格式

Given 用户提交的 spec 文件通过所有校验
When 系统输出校验报告
Then 系统 SHALL 输出包含以下结构的 JSON：valid 为 true，issues 为空数组，summary 中 errors、warnings、info 均为 0

#### Scenario: 正常流程-校验失败时的报告格式

Given 用户提交的 spec 文件存在 2 个 ERROR 和 1 个 WARNING
When 系统输出校验报告
Then 系统 SHALL 输出包含以下结构的 JSON：valid 为 false，issues 数组包含 3 个条目（每个包含 level、path、message 字段），summary 中 errors 为 2、warnings 为 1、info 为 0

#### Scenario: 异常场景-文件读取失败时的报告

Given 用户提交的 spec 文件路径指向一个不存在的文件
When 系统执行校验
Then 系统 SHALL 输出校验报告，valid 为 false，issues 中包含一条 ERROR 级别问题描述文件读取失败

#### Scenario: 边界条件-issues 中的路径定位信息

Given 用户提交的 spec 文件中第 2 个 requirement 的第 1 个场景存在问题
When 系统输出校验报告
Then 系统 SHALL 在对应 issue 的 path 字段中包含具体的定位信息（如 requirements[1].scenarios[0]）

### Requirement: 自定义规则

系统 MUST 支持用户注册自定义校验规则，自定义规则与内置规则使用相同的规则接口，校验时自动参与规则引擎的执行流程。

#### Scenario: 正常流程-注册并执行自定义规则

Given 用户定义并注册了一条自定义规则，该规则检查 requirement 文本长度不超过 500 字符
When 用户提交一份 requirement 文本超过 500 字符的 spec 文件进行校验
Then 系统 SHALL 执行自定义规则并输出对应的校验问题，与内置规则的问题一起出现在 issues 数组中

#### Scenario: 正常流程-自定义规则与内置规则共存

Given 用户注册了自定义规则，同时系统内置规则也在运行
When 用户提交 spec 文件进行校验
Then 系统 SHALL 同时执行内置规则和自定义规则，校验报告中包含两类规则产生的所有问题

#### Scenario: 异常场景-自定义规则的严重级别

Given 用户注册了一条 level 为 ERROR 的自定义规则
When spec 文件触发该自定义规则
Then 系统 SHALL 将该问题标记为 ERROR 级别，与其他 ERROR 问题一样导致校验失败（valid 为 false）

#### Scenario: 边界条件-无自定义规则时使用默认规则集

Given 用户未注册任何自定义规则
When 用户提交 spec 文件进行校验
Then 系统 SHALL 使用默认内置规则集执行校验，校验行为与标准校验一致
