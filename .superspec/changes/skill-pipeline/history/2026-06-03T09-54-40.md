# 技能间协作管道

## Purpose

superSpec 目前拥有 11 个独立技能（brainstorm、generate-spec、validate-spec、write-plan、generate-test、tdd、subagent-dev、verify、debug、update-spec、archive），但这些技能之间缺少明确的调用链定义和状态传递机制。用户和 AI 在使用时需要手动判断何时调用哪个技能，以及如何将一个技能的输出传递给下一个技能。本功能旨在建立一套标准化的技能协作管道，定义核心工作流链、技能间数据流转、并行执行支持、前置后置条件以及失败回退策略，使 superSpec 的技能系统从松散的工具集合进化为结构化的工作流引擎。

## Requirements

### Requirement: 核心工作流链定义

系统 SHALL 定义一条核心工作流链：brainstorm 生成需求 spec，generate-spec 生成结构化 spec 文件，validate-spec 校验 spec 质量，write-plan 生成实现计划，实现阶段（tdd 或 subagent-dev）编写代码，verify 验证实现完整性，archive 归档变更。每个技能在链中有明确的位置和角色。

#### Scenario: 正常流程-完整工作流从头到尾执行

Given 用户提出一个新功能需求
When 启动核心工作流管道
Then 系统 SHALL 按顺序执行 brainstorm、generate-spec、validate-spec、write-plan、实现、verify、archive 七个阶段，每个阶段完成后自动进入下一个阶段

#### Scenario: 边界条件-用户从中间阶段开始

Given 用户已经有一个校验通过的 spec 文件 `.superspec/specs/batch-export/spec.md`
When 用户请求从 write-plan 阶段开始执行
Then 系统 SHALL 跳过 brainstorm、generate-spec、validate-spec 阶段，直接从 write-plan 开始执行，并将已有的 spec 文件作为输入传递给 write-plan 技能

#### Scenario: 边界条件-工作流链中某阶段被标记为可选

Given 一个工作流配置将 debug 阶段标记为可选
When 管道执行到 debug 阶段且当前没有需要调试的问题
Then 系统 SHALL 跳过 debug 阶段并直接进入下一个阶段，同时在执行日志中记录该阶段被跳过的原因

### Requirement: 技能间状态传递

管道中前一个技能的输出 MUST 作为后一个技能的输入，状态传递通过结构化的上下文对象实现。上下文对象包含当前 spec 路径、校验结果、实现计划路径、验证报告等字段，每个技能在执行前可以读取上下文，在执行后可以写入上下文。

#### Scenario: 正常流程-brainstorm 输出传递给 generate-spec

Given brainstorm 技能已完成需求收集并生成了初步 spec 内容
When 管道将控制权传递给 generate-spec 技能
Then generate-spec 技能 SHALL 从上下文对象中读取 brainstorm 的输出内容，包括用户确认的需求范围和边界条件，并以此为基础生成结构化 spec 文件

#### Scenario: 异常场景-validate-spec 校验失败阻断传递

Given generate-spec 技能已生成 spec 文件但 validate-spec 校验发现 ERROR 级别问题
When 管道尝试将状态传递给 write-plan 技能
Then 系统 SHALL 阻断状态传递，将校验失败信息写入上下文，并将控制权回退给 generate-spec 技能要求修正

#### Scenario: 异常场景-上下文对象中缺少必要字段

Given 一个技能尝试从上下文中读取 specPath 字段
When 上下文对象中不存在该字段
Then 系统 SHALL 报告一个明确的错误信息，指出缺少 specPath 字段，并提示用户可能需要从更早的阶段开始执行或手动指定 spec 路径

### Requirement: 并行技能执行支持

管道 SHALL 支持在满足依赖关系的前提下并行执行多个技能实例。典型场景包括：同时对多个 spec 运行 validate-spec，同时对多个任务运行 verify，或同时执行多个独立的 subagent-dev 任务。

#### Scenario: 正常流程-并行校验多个 spec 文件

Given 项目中存在 3 个 spec 文件：batch-export、user-auth、api-rate-limit
When 用户请求校验所有 spec
Then 系统 SHALL 并行启动 3 个 validate-spec 实例，每个实例独立校验一个 spec 文件，最终汇总所有校验结果

#### Scenario: 异常场景-并行执行中某个实例失败

Given 3 个 validate-spec 实例正在并行运行
When 其中 1 个实例校验失败（batch-export 的 spec 存在 ERROR）
Then 系统 SHALL 等待所有并行实例完成后，汇总结果报告：2 个通过、1 个失败，并将失败的 spec 标记为需要修正

#### Scenario: 边界条件-并行执行的资源限制

Given 用户配置了最大并行数为 2
When 用户请求同时校验 5 个 spec 文件
Then 系统 SHALL 最多同时运行 2 个校验实例，当某个实例完成后立即启动下一个排队中的实例，直到全部 5 个 spec 校验完成

### Requirement: 前置条件和后置条件

每个技能在管道中执行前 MUST 检查前置条件，执行后 MUST 验证后置条件。前置条件包括输入文件存在、上游技能已完成等；后置条件包括输出文件已生成、校验已通过等。任一条件不满足时必须阻断执行并报告原因。

#### Scenario: 正常流程-write-plan 的前置条件检查通过

Given validate-spec 已成功校验 spec 文件，输出 valid: true
When 管道尝试执行 write-plan 技能
Then write-plan 技能 SHALL 检查前置条件：spec 文件存在且已通过校验，确认条件满足后开始执行计划生成

#### Scenario: 异常场景-write-plan 的前置条件检查失败

Given spec 文件 `.superspec/specs/batch-export/spec.md` 不存在
When 管道尝试执行 write-plan 技能
Then write-plan 技能 SHALL 拒绝执行并报告："前置条件不满足：spec 文件不存在，请先运行 generate-spec 和 validate-spec"

#### Scenario: 异常场景-verify 的后置条件验证失败

Given verify 技能执行完毕但测试套件中仍有 2 个失败的测试用例
When 管道检查 verify 的后置条件
Then 系统 SHALL 阻止进入 archive 阶段，将 verify 的失败结果写入上下文，并提示用户需要先修复失败的测试用例

### Requirement: 失败回退和重试策略

当管道中某个技能执行失败时，系统 MUST 支持自动回退到上游技能或重试当前技能。回退策略根据失败类型决定：数据格式错误回退到生成阶段，逻辑错误回退到需求阶段，临时性错误直接重试。每次重试 SHALL 记录重试次数和原因，超过最大重试次数后停止并报告。

#### Scenario: 正常流程-validate-spec 未通过后自动回退到 generate-spec

Given generate-spec 生成的 spec 文件未通过 validate-spec 校验，原因为"需求文本必须包含 SHALL 或 MUST"
When 管道检测到校验未通过
Then 系统 SHALL 自动将控制权回退给 generate-spec 技能，附带校验诊断信息，generate-spec 技能根据诊断信息修正 spec 后重新提交校验

#### Scenario: 正常流程-verify 未通过后重试一次

Given verify 技能因测试超时而未通过（非逻辑问题）
When 管道检测到验证未通过且原因为临时性问题
Then 系统 SHALL 自动重试 verify 技能一次，重试前等待 5 秒，如果重试仍然未通过则停止并报告最终结果

#### Scenario: 边界条件-超过最大重试次数

Given 一个技能已经连续未通过 3 次（最大重试次数为 3）
When 管道检测到第 3 次未通过
Then 系统 SHALL 停止重试，将完整的重试日志（包含每次重试的诊断信息和时间戳）写入上下文，并向用户报告该技能执行未通过且已达到最大重试次数
