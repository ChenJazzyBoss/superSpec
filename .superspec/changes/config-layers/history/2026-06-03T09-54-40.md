# 配置分层系统

## Purpose

superSpec 当前仅支持单一的 .superspec/config.yaml 配置文件，无法满足多环境、多用户、多变更并行的复杂场景需求。本功能旨在实现三级配置分层系统，支持全局配置、项目配置和变更级配置的独立管理，并通过明确的优先级和合并策略确保配置行为可预测、可审计，为团队协作和 CI/CD 流水线提供灵活的配置覆盖能力。

## Requirements

### Requirement: 三级配置文件路径定义

系统 SHALL 支持三个层级的配置文件，路径分别为全局配置 `~/.config/superspec/config.json`、项目配置 `.superspec/config.yaml`、变更配置 `.superspec/changes/<change-name>/.superspec.yaml`。每层配置文件均为可选，缺失时使用下一层级的默认值。

#### Scenario: 正常-三层配置文件均存在

Given 用户在全局路径 `~/.config/superspec/config.json` 中设置了默认语言为英文，项目配置 `.superspec/config.yaml` 中设置了项目名称为 alpha，变更配置 `.superspec/changes/feat-login/.superspec.yaml` 中启用了严格模式
When 用户在变更 feat-login 下运行 superspec validate
Then 系统 SHALL 同时加载三层配置文件，最终生效的配置中 defaultLanguage 为英文、projectName 为 alpha、strictMode 为 true

#### Scenario: 边界-只有全局配置存在

Given 用户仅在 `~/.config/superspec/config.json` 中配置了 defaultLanguage 为中文，项目配置和变更配置文件均不存在
When 用户在任意目录运行 superspec validate
Then 系统 SHALL 使用全局配置的值，并对缺失的项目和变更配置项使用内置默认值

#### Scenario: 边界-所有配置文件均缺失

Given 全局配置、项目配置和变更配置文件均不存在
When 用户首次运行 superspec init
Then 系统 SHALL 使用内置默认值完成初始化，并在当前目录创建 `.superspec/config.yaml` 项目配置文件

### Requirement: 配置优先级覆盖规则

配置优先级 SHALL 按以下顺序从高到低排列：CLI flag > 变更配置 > 项目配置 > 全局配置 > 内置默认值。高优先级的配置值 MUST 覆盖低优先级的同名配置值，不得出现低优先级覆盖高优先级的情况。

#### Scenario: 正常-CLI flag 覆盖所有配置

Given 项目配置中 strictMode 为 false，全局配置中 strictMode 为 true
When 用户执行 `superspec validate --strict`
Then 最终生效的 strictMode MUST 为 true，因为 CLI flag 优先级高于项目配置和全局配置

#### Scenario: 正常-变更配置覆盖项目配置

Given 项目配置 `.superspec/config.yaml` 中 maxLineLength 为 120，变更配置 `.superspec/changes/fix-bug/.superspec.yaml` 中 maxLineLength 为 80
When 用户在变更 fix-bug 目录下运行 superspec lint
Then 最终生效的 maxLineLength MUST 为 80，变更配置覆盖了项目配置

#### Scenario: 边界-全局配置作为兜底默认值

Given 全局配置中 defaultLanguage 为英文，项目配置和变更配置中均未设置 defaultLanguage
When 用户运行 superspec validate
Then 最终生效的 defaultLanguage MUST 为英文，来自全局配置的兜底值

### Requirement: 配置合并策略

系统 SHALL 对对象类型的配置项采用深度合并（deep merge）策略，对数组和基础类型采用直接覆盖策略。深度合并时 MUST 递归处理嵌套对象，确保子属性的独立覆盖不会丢失同级的其他属性。

#### Scenario: 正常-对象类型配置深度合并

Given 全局配置中 validation.rules 为 `{ "no-trailing-spaces": true, "max-line-length": 120 }`，项目配置中 validation.rules 为 `{ "max-line-length": 80 }`
When 系统合并配置
Then 最终 validation.rules MUST 为 `{ "no-trailing-spaces": true, "max-line-length": 80 }`，项目配置覆盖了 max-line-length 而保留了全局的 no-trailing-spaces

#### Scenario: 正常-数组类型配置直接覆盖

Given 全局配置中 hooks.pre-validate 为 `["check-branch", "check-commits"]`，项目配置中 hooks.pre-validate 为 `["lint-staged"]`
When 系统合并配置
Then 最终 hooks.pre-validate MUST 为 `["lint-staged"]`，项目配置的数组完全替换了全局配置的数组

#### Scenario: 边界-嵌套三层对象的合并

Given 全局配置中 reporting.format 为 `{ "type": "json", "indent": 2 }`，项目配置中 reporting.format 为 `{ "type": "markdown" }`，变更配置中 reporting.format 为 `{ "indent": 4 }`
When 系统合并三层配置
Then 最终 reporting.format MUST 为 `{ "type": "markdown", "indent": 4 }`，变更配置覆盖了 indent，项目配置覆盖了 type，全局配置的 indent 被变更配置覆盖

### Requirement: 配置 Schema 校验

每层配置文件在加载时 MUST 使用 Zod schema 进行严格校验。校验失败时系统 SHALL 输出包含文件路径、行号和具体错误描述的诊断信息，并以非零退出码终止执行。

#### Scenario: 正常流程-配置文件校验通过

Given 项目配置 `.superspec/config.yaml` 内容为 `strictMode: true`，且 strictMode 字段在 schema 中定义为 boolean 类型
When 系统加载并校验该配置文件
Then 系统 SHALL 正常完成校验，输出校验通过结果

#### Scenario: 错误-配置文件包含未知字段

Given 项目配置 `.superspec/config.yaml` 中包含一个未在 schema 中定义的字段 `unknownField: "value"`
When 系统加载并校验该配置文件
Then 系统 SHALL 输出包含文件路径和未知字段名称的警告或错误信息

#### Scenario: 错误-配置文件字段类型错误

Given 项目配置 `.superspec/config.yaml` 中 maxLineLength 设置为字符串 `"not-a-number"`，而 schema 定义其为 number 类型
When 系统加载并校验该配置文件
Then 系统 SHALL 输出包含文件路径和类型不匹配描述的错误信息，并以非零退出码终止

### Requirement: 配置初始化与迁移

系统 SHALL 支持从旧版单一 config.yaml 格式自动迁移到新的三级配置系统。迁移命令 MUST 读取旧配置文件，根据内容智能拆分到对应的配置层级，并在迁移前创建备份。

#### Scenario: 成功-从旧格式迁移到项目配置

Given 用户当前目录下存在旧版 `.superspec/config.yaml`，且未设置任何全局配置
When 用户执行 `superspec config migrate`
Then 系统 SHALL 将旧配置内容迁移到新版 `.superspec/config.yaml`，原文件重命名为 `.superspec/config.yaml.bak`，并输出迁移成功的摘要信息

#### Scenario: 异常-旧配置文件不存在时执行迁移

Given 用户当前目录下不存在 `.superspec/config.yaml` 文件
When 用户执行 `superspec config migrate`
Then 系统 SHALL 输出提示信息说明未找到可迁移的配置文件，并以零退出码正常结束

#### Scenario: 异常-旧配置文件包含已废弃的字段

Given 旧版 `.superspec/config.yaml` 中包含已废弃的字段 `legacyMode: true`，该字段在新版 schema 中不存在
When 用户执行 `superspec config migrate`
Then 系统 SHALL 将已废弃字段记录到迁移报告中，将其从新配置中排除，并在输出中明确告知用户哪些字段被跳过及原因
