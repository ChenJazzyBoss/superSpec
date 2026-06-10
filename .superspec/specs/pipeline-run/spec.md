# Pipeline Run 命令

## Purpose

实现 `superspec pipeline run` 命令，将已有的 Pipeline 执行引擎真正接入 CLI，提供自动化工作流状态管理、前置/后置条件检查和执行历史记录。这是将 Pipeline 从"可查看的 DAG 定义"升级为"可执行的自动化引擎"的关键一步。

## Requirements

### Requirement: Pipeline Run 状态管理

系统 SHALL 提供 `superspec pipeline run <spec-name>` 命令，基于已有的 PipelineExecutor 创建持久化的管道执行记录，跟踪每个阶段的完成状态。

#### Scenario: 从头开始运行管道

Given 一个已存在的 spec 文件 `.superspec/specs/<name>/spec.md`
When 用户执行 `superspec pipeline run <name>`
Then 系统创建执行记录文件 `.superspec/pipeline/<exec-id>.json`
And 自动执行 validate-spec 阶段（检查已有 spec 是否通过校验）
And 输出当前阶段状态和推荐下一步操作

#### Scenario: 从指定阶段恢复执行

Given 一个已有的管道执行记录 `.superspec/pipeline/<exec-id>.json`
When 用户执行 `superspec pipeline run <name> --from <stage>`
Then 系统从指定阶段开始执行
And 将之前的阶段标记为 skipped

#### Scenario: 查看管道执行状态

Given 一个正在进行或已完成的管道执行
When 用户执行 `superspec pipeline status [--exec <exec-id>]`
Then 系统显示每个阶段的执行状态（pending/running/completed/failed/skipped）
And 显示阶段耗时和错误信息

#### Scenario: spec 文件不存在时报错

Given 不存在 `.superspec/specs/<name>/spec.md` 文件
When 用户执行 `superspec pipeline run <name>`
Then 系统输出错误信息 "spec 文件不存在"
And 退出码为 1

### Requirement: 阶段自动化执行

系统 SHALL 为可程序化执行的阶段注册自动 handler，无需人工干预即可完成。对于需要 AI 参与的阶段，输出明确的操作指引。

#### Scenario: 自动执行 validate-spec 阶段

Given 管道执行到 validate-spec 阶段
And 上下文中已有 specPath
Then 系统自动调用 Validator 校验 spec
And 将校验结果写入上下文的 validationReport
And 后置条件检查自动判断是否通过

#### Scenario: validate-spec 校验失败时阻断

Given 管道执行到 validate-spec 阶段
And spec 校验结果为 valid=false
Then 系统将该阶段标记为 failed
And 将失败原因写入执行记录
And 不继续执行后续阶段

#### Scenario: 自动执行 archive 阶段

Given 管道执行到 archive 阶段
And 上下文中 verifyPassed 为 true
Then 系统自动调用 archiveChange 完成归档
And 将归档路径写入上下文

#### Scenario: AI 阶段输出操作指引

Given 管道执行到 brainstorm 或 generate-spec 或 write-plan 或 implement 或 verify 阶段
And 这些阶段需要 AI（Claude）参与
Then 系统输出该阶段的操作指引（使用哪个技能、需要什么上下文）
And 将阶段标记为 pending（等待 AI 执行后通过 `pipeline run --from` 恢复）

### Requirement: 执行历史与持久化

系统 SHALL 将管道执行记录持久化到 `.superspec/pipeline/` 目录，支持跨多次 CLI 调用的状态恢复。

#### Scenario: 持久化执行记录

Given 管道执行过程中每个阶段完成时
When 阶段状态发生变更
Then 系统将执行记录写入 `.superspec/pipeline/<exec-id>.json`
And 记录包含阶段状态、上下文快照、时间戳

#### Scenario: 列出所有执行记录

Given `.superspec/pipeline/` 目录下有多个执行记录文件
When 用户执行 `superspec pipeline list`
Then 系统显示所有执行记录的概要（exec-id、spec 名称、状态、开始时间）

#### Scenario: 恢复中断的执行

Given 一个状态为 failed 的执行记录
When 用户执行 `superspec pipeline resume <exec-id>`
Then 系统从失败阶段重新开始执行
And 使用已保存的上下文快照

#### Scenario: 执行记录不存在时报错

Given `.superspec/pipeline/` 目录下没有对应的执行记录
When 用户执行 `superspec pipeline resume <exec-id>`
Then 系统输出错误信息 "执行记录不存在"
And 退出码为 1
