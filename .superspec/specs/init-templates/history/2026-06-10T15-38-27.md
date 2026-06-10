# Init Template 增强

## Purpose

为 superSpec 的 init 命令添加多项目类型模板支持，让用户在初始化时可以选择适合自己项目类型的背景情报模板，从而收集更精准的上下文信息，提升 AI 生成 spec 的质量。当前系统只有一个通用的 init-spec-template.md，不同类型项目（Web API、CLI 工具、库、全栈应用）的上下文需求差异很大，通用模板无法引导用户提供关键信息。

## Requirements

### Requirement: 项目类型模板选择

系统 SHALL 在 init 命令执行时支持 --template 参数指定项目类型模板。

#### Scenario: 使用默认模板初始化

Given 用户执行 superspec init 命令
When 未指定 --template 参数
Then 系统使用通用模板（general）进行初始化
And 初始化成功完成

#### Scenario: 使用指定模板初始化

Given 用户执行 superspec init 命令
When 指定 --template web-api 参数
Then 系统使用 web-api 类型模板进行初始化
And 生成的 init-spec-template.md 包含 API 相关的上下文字段

#### Scenario: 使用无效模板类型

Given 用户执行 superspec init 命令
When 指定 --template invalid-type 参数
Then 系统显示错误信息提示可用模板列表
And 初始化不执行

### Requirement: 多类型模板定义

系统 SHALL 至少提供 4 种项目类型的 Init Template：general（通用）、web-api（Web API）、cli（命令行工具）、library（库/SDK）。

#### Scenario: 模板包含项目类型特有字段

Given web-api 模板定义
When 查看模板内容
Then 模板包含 API 端点设计、认证方式、数据模型等 API 相关上下文字段
And 模板包含通用的需求描述和目标用户字段

#### Scenario: CLI 模板包含命令行特有字段

Given cli 类型模板定义
When 查看模板内容
Then 模板包含命令结构、参数设计、输出格式等 CLI 相关上下文字段

#### Scenario: 库模板包含 SDK 特有字段

Given library 类型模板定义
When 查看模板内容
Then 模板包含 API 接口设计、版本策略、兼容性约束等 SDK 相关上下文字段

#### Scenario: 模板文件缺失时的降级

Given 某个模板类型的模板文件不存在
When 系统尝试加载该模板
Then 系统回退使用通用模板并输出警告信息

### Requirement: 模板列表查询

系统 SHALL 支持 superspec init --list-templates 命令列出所有可用模板。

#### Scenario: 列出所有模板

Given 系统有 4 种模板定义
When 用户执行 superspec init --list-templates
Then 系统显示所有可用模板的名称和简要描述
And 输出格式为表格形式

#### Scenario: 无可用模板时的降级处理

Given 模板目录为空或不存在
When 用户执行 superspec init --list-templates
Then 系统显示提示信息说明无可用模板
And 建议用户使用默认通用模板

### Requirement: 交互式模板选择

系统 SHALL 在交互模式（--interactive）下提供模板类型选择。

#### Scenario: 交互模式中选择模板

Given 用户执行 superspec init --interactive
When 进入交互配置流程
Then 系统在收集项目名称后询问项目类型
And 提供多选项供用户选择
And 根据选择使用对应模板

#### Scenario: 交互模式中选择通用模板

Given 用户执行 superspec init --interactive
When 在项目类型选择时选择通用类型
Then 系统使用通用模板进行后续初始化

#### Scenario: 交互模式中选择无效选项

Given 用户执行 superspec init --interactive
When 在项目类型选择时输入不在选项范围内的值
Then 系统提示输入无效并重新提示选择
And 不会终止初始化流程
