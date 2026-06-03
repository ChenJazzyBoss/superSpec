# 项目初始化

## Purpose

superSpec 的 init 命令负责为项目创建完整的 superSpec 工作环境。当用户首次在项目中使用 superSpec 时，需要一个标准化的初始化流程来建立目录结构、生成配置文件、注入 AI 上下文以及部署模板和脚本。本功能确保每个项目都能以一致的方式启动 superSpec，同时支持重复执行以安全地修复缺失的文件，使用户无需手动管理底层目录和配置细节即可开始 spec 驱动的开发流程。

## Requirements

### Requirement: 目录结构创建

系统 SHALL 创建 `.superspec/` 目录及其子目录（templates、scripts、specs），确保所有必要的目录骨架完整就位。

#### Scenario: 正常流程-首次初始化创建完整目录结构

Given 用户在一个尚未执行过 init 的项目根目录中
When 用户执行 init 命令
Then 系统 SHALL 创建 `.superspec/`、`.superspec/templates/`、`.superspec/scripts/`、`.superspec/specs/` 四个目录，并在终端输出创建成功的目录列表

#### Scenario: 异常场景-部分目录已存在时补全缺失目录

Given 项目中已存在 `.superspec/` 目录和 `.superspec/templates/` 子目录，但缺少 `.superspec/scripts/` 和 `.superspec/specs/`
When 用户执行 init 命令
Then 系统 SHALL 创建缺失的 `scripts/` 和 `specs/` 子目录，保留已存在的目录不变，并在终端输出补全的目录列表

#### Scenario: 边界条件-所有目录均已存在时跳过创建

Given 项目中 `.superspec/` 及其所有子目录均已存在
When 用户执行 init 命令
Then 系统 SHALL 跳过目录创建步骤，不输出任何创建信息，继续执行后续初始化步骤

### Requirement: 配置文件生成

系统 MUST 生成 `.superspec/config.yaml`，包含项目名称、语言、严格模式等配置项，为后续的 spec 管理和校验提供基础设置。

#### Scenario: 正常流程-首次初始化生成默认配置文件

Given 项目根目录中不存在 `.superspec/config.yaml`
When 用户执行 init 命令
Then 系统 SHALL 在 `.superspec/config.yaml` 中生成包含 projectName（从项目目录名推断）、defaultLanguage（默认 "zh"）、strictMode（默认 false）的配置文件，并在终端输出配置文件的路径

#### Scenario: 异常场景-通过命令行参数覆盖默认配置值

Given 项目根目录中不存在 `.superspec/config.yaml`
When 用户执行 init 命令并传入 `--name my-project --lang en --strict` 参数
Then 系统 SHALL 生成的 `.superspec/config.yaml` 中 projectName 为 "my-project"、defaultLanguage 为 "en"、strictMode 为 true

#### Scenario: 边界条件-配置文件已存在时保留现有配置

Given 项目中已存在 `.superspec/config.yaml`，其中 projectName 为 "alpha"、strictMode 为 true
When 用户执行 init 命令
Then 系统 SHALL 保留现有配置文件不修改，并在终端提示配置文件已存在，跳过生成

### Requirement: CLAUDE.md 注入

系统 SHALL 在项目的 CLAUDE.md 中注入 superSpec 上下文信息，包括可用技能列表和常用校验命令，使 AI 助手能够在后续对话中自动感知 superSpec 能力。

#### Scenario: 正常流程-项目无 CLAUDE.md 时创建并注入

Given 项目根目录中不存在 CLAUDE.md 文件
When 用户执行 init 命令
Then 系统 SHALL 创建 CLAUDE.md 文件，内容包含 superSpec 技能列表（brainstorm、generate-spec、validate-spec 等）、常用命令示例（如 `superspec validate`）以及 `.superspec/` 目录结构说明

#### Scenario: 异常场景-项目已有 CLAUDE.md 时追加注入

Given 项目根目录中已存在 CLAUDE.md 文件，其中包含项目的其他上下文信息
When 用户执行 init 命令
Then 系统 SHALL 在现有 CLAUDE.md 的末尾追加 superSpec 上下文段落，使用明确的起止标记（如 `<!-- superspec:start -->` 和 `<!-- superspec:end -->`）包裹注入内容，保留原有内容不受影响

#### Scenario: 边界条件-CLAUDE.md 中已包含 superSpec 上下文时跳过注入

Given 项目根目录中的 CLAUDE.md 已包含 `<!-- superspec:start -->` 标记
When 用户执行 init 命令
Then 系统 SHALL 跳过 CLAUDE.md 注入步骤，并在终端提示 superSpec 上下文已存在

### Requirement: 模板和脚本复制

系统 MUST 将 spec 模板和校验脚本复制到 `.superspec/` 对应目录中，为用户提供开箱即用的 spec 编写起点和校验工具。

#### Scenario: 正常流程-首次初始化复制模板和脚本

Given `.superspec/templates/` 和 `.superspec/scripts/` 目录为空或刚创建
When 用户执行 init 命令
Then 系统 SHALL 将内置的 spec 模板文件（如 `spec-template.md`）复制到 `.superspec/templates/`，将校验脚本文件（如 `validate.sh`、`validate.js`）复制到 `.superspec/scripts/`，并在终端输出复制的文件列表

#### Scenario: 异常场景-模板和脚本已存在时跳过复制

Given `.superspec/templates/spec-template.md` 和 `.superspec/scripts/validate.sh` 均已存在
When 用户执行 init 命令
Then 系统 SHALL 跳过模板和脚本的复制步骤，不覆盖现有文件，并在终端提示文件已存在

#### Scenario: 边界条件-只有部分文件缺失时补全

Given `.superspec/templates/spec-template.md` 已存在，但 `.superspec/scripts/validate.sh` 缺失
When 用户执行 init 命令
Then 系统 SHALL 只复制缺失的 `validate.sh` 到 `.superspec/scripts/`，不覆盖已存在的 `spec-template.md`，并在终端输出补全的文件列表

### Requirement: 幂等性

系统 SHALL 支持重复执行 init 命令，已存在的文件和目录 MUST 不被覆盖，执行结果与首次初始化后一致。

#### Scenario: 正常流程-完整项目再次执行 init

Given 项目已通过 init 完成了目录创建、配置生成、CLAUDE.md 注入和模板复制的全部步骤
When 用户再次执行 init 命令
Then 系统 SHALL 检测到所有组件均已就位，不修改任何现有文件，终端输出所有步骤均已跳过的汇总信息，并以零退出码结束

#### Scenario: 异常场景-项目部分损坏后执行 init 修复

Given 项目之前执行过 init，但 `.superspec/scripts/` 目录被意外删除，配置文件和 CLAUDE.md 仍完好
When 用户执行 init 命令
Then 系统 SHALL 只补全缺失的 `scripts/` 目录和校验脚本文件，不修改配置文件和 CLAUDE.md，终端输出实际执行的操作和跳过的操作

#### Scenario: 边界条件-init 执行过程中途被中断后重新执行

Given 用户执行 init 命令但在配置文件生成步骤中途中断（如 Ctrl+C），此时目录已创建但 config.yaml 未生成
When 用户重新执行 init 命令
Then 系统 SHALL 跳过已存在的目录创建步骤，从配置文件生成步骤继续执行，最终结果与完整执行一次 init 完全一致
