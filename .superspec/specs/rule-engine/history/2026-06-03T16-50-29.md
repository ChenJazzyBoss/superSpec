# 规则引擎

## Purpose

规则引擎是 superSpec 校验系统的核心组件，负责执行所有业务逻辑层面的 spec 质量检查。与结构校验（验证字段是否存在、类型是否正确）不同，规则引擎专注于内容质量：检测模糊词汇、验证需求关键词规范性、检查场景类型分布合理性等。规则引擎通过统一的 Rule 接口定义规则，支持 ERROR、WARNING、INFO 三级严重性，并根据规则的 target 字段将检查自动分派到 spec、requirement 或 scenario 不同层级。该引擎支持运行时注册新规则，使用户能够根据项目需求灵活扩展校验能力。

<!-- DIAGRAM:flowchart -->

## Requirements

### Requirement: 规则定义

系统 SHALL 支持通过 Rule 接口定义自定义校验规则，每条规则包含 id、name、level、target、check 五个核心字段，确保规则定义的一致性和可扩展性。

#### Scenario: 正常流程-定义一条完整的自定义规则

Given 用户定义一条规则，包含 id 为 "max-requirement-length"、name 为 "需求文本长度检查"、level 为 WARNING、target 为 "requirement"、check 为一个检查函数
When 系统加载该规则
Then 系统 SHALL 将该规则纳入规则集，在校验时按照其定义的 target 和 level 执行检查

#### Scenario: 异常场景-规则定义缺少必需字段

Given 用户定义的规则缺少 id 字段
When 系统尝试加载该规则
Then 系统 SHALL 拒绝加载该规则，输出明确的错误信息指出缺失的字段，不影响其他规则的正常加载

#### Scenario: 边界条件-规则的 check 函数抛出异常

Given 用户定义的规则的 check 函数在执行时抛出运行时异常
When 系统在校验过程中执行该规则
Then 系统 SHALL 捕获该异常，将该规则标记为执行失败，继续执行其余规则的校验，不因单条规则失败而中断整个校验流程

### Requirement: 三级严重性

系统 MUST 将规则分为 ERROR、WARNING、INFO 三级严重性，每个级别有明确的语义：ERROR 表示必须修正的阻断性问题，WARNING 表示建议修正的质量问题，INFO 表示仅供参考的改进建议。

#### Scenario: 正常流程-不同严重级别的规则同时触发

Given 规则集中包含一条 ERROR 级别规则和一条 WARNING 级别规则，spec 文件同时触发了这两条规则
When 系统完成校验
Then 系统 SHALL 将触发的问题分别标记为 ERROR 和 WARNING，在校验报告的 summary 中分别统计各级别的问题数量

#### Scenario: 异常场景-ERROR 级别问题导致校验失败

Given 规则集中包含一条 ERROR 级别规则，spec 文件触发了该规则
When 系统完成校验
Then 系统 SHALL 将校验结果的 valid 设为 false，确保 ERROR 级别问题阻断校验通过

#### Scenario: 边界条件-仅 INFO 级别问题不导致校验失败

Given 规则集中仅包含 INFO 级别规则，spec 文件触发了这些规则
When 系统完成校验
Then 系统 SHALL 将校验结果的 valid 设为 true，INFO 问题记录在 issues 数组中但不影响校验结果

### Requirement: 目标分派

系统 SHALL 根据规则的 target 字段（spec、requirement、scenario）自动分派检查，确保每条规则只在其目标层级上执行，避免跨层级的误检。

#### Scenario: 正常流程-target 为 requirement 的规则仅检查需求层级

Given 规则集中包含一条 target 为 "requirement" 的规则，该规则检查需求文本是否包含 SHALL 或 MUST
When 系统对一份包含 3 个 requirement 的 spec 执行校验
Then 系统 SHALL 仅在每个 requirement 的文本上执行该规则，不检查 spec 层级或 scenario 层级的内容

#### Scenario: 异常场景-target 为 scenario 的规则跳过无场景的需求

Given 规则集中包含一条 target 为 "scenario" 的规则，spec 中某个 requirement 下没有 scenarios 数组
When 系统执行校验
Then 系统 SHALL 跳过该 requirement 的场景级规则检查，不产生误报，继续检查其他有场景的 requirement

#### Scenario: 边界条件-target 为 spec 的规则仅执行一次

Given 规则集中包含一条 target 为 "spec" 的规则，该规则检查 spec 的概述长度
When 系统对一份包含多个 requirement 的 spec 执行校验
Then 系统 SHALL 仅在整个 spec 层级执行一次该规则，不在每个 requirement 上重复执行

### Requirement: 规则注册

系统 MUST 支持在运行时注册新的校验规则，新注册的规则立即生效，与已有的内置规则使用相同的执行流程和报告格式。

#### Scenario: 正常流程-运行时注册单条新规则

Given 系统已加载默认内置规则集
When 用户在运行时注册一条新的自定义规则
Then 系统 SHALL 将该规则加入当前规则集，在下一次校验执行时自动包含该新规则

#### Scenario: 正常流程-注册的规则与内置规则共存

Given 用户在运行时注册了 2 条自定义规则，系统内置规则有 5 条
When 用户提交 spec 文件进行校验
Then 系统 SHALL 同时执行 7 条规则（5 条内置 + 2 条自定义），校验报告中包含所有规则产生的问题

#### Scenario: 异常场景-注册重复 id 的规则

Given 系统中已存在一条 id 为 "no-ambiguous-words" 的内置规则
When 用户尝试注册另一条 id 同样为 "no-ambiguous-words" 的新规则
Then 系统 SHALL 拒绝注册并输出错误信息，指出规则 id 已存在，避免规则覆盖导致的行为不一致

#### Scenario: 边界条件-注册后立即卸载规则

Given 用户在运行时注册了一条自定义规则，随后立即卸载该规则
When 用户提交 spec 文件进行校验
Then 系统 SHALL 不再执行该已卸载的规则，校验报告中不包含该规则产生的任何问题
