# config-layers

## Purpose

配置分层能力使 superSpec 能够在不同层级管理配置，支持全局默认、项目特定和变更临时三个维度的配置覆盖。该能力解决了多项目环境下配置复用与隔离的矛盾，用户可以在全局层设定通用默认值，在项目层覆盖特定行为，在变更层临时调整参数进行实验。通过优先级合并、深度合并和 Zod 校验机制，确保每一层配置都合法且合并结果符合预期。同时提供从旧版单一配置文件自动迁移的能力，降低升级成本。

---

## Requirements

### Requirement: 三级配置

系统 SHALL 支持全局配置、项目配置、变更配置三级文件。

#### Scenario: 正常流程 - 三级配置文件均存在

**Given** 全局配置文件位于 `~/.superspec/config.yaml`，项目配置文件位于项目根目录 `.superspec/config.yaml`，变更配置文件位于 `.superspec/changes/current.yaml`
**When** 系统加载配置
**Then** 系统 SHALL 成功读取三级配置文件，并返回合并后的配置对象

#### Scenario: 异常场景 - 仅全局配置存在

**Given** 仅全局配置文件存在，项目配置和变更配置均不存在
**When** 系统加载配置
**Then** 系统 SHALL 使用全局配置作为最终配置，项目层和变更层视为使用默认空配置

#### Scenario: 边界条件 - 三级配置文件均不存在

**Given** 三级配置文件均不存在
**When** 系统加载配置
**Then** 系统 SHALL 使用内置默认配置，并记录信息日志"未找到任何配置文件，使用默认配置"

#### Scenario: 异常场景 - 配置文件格式错误

**Given** 项目配置文件存在但内容不是合法 YAML
**When** 系统加载配置
**Then** 系统 SHALL 返回错误"项目配置文件格式错误: [具体错误信息]"，并中止配置加载

#### Scenario: 边界条件 - 配置文件为空文件

**Given** 项目配置文件存在但内容为空
**When** 系统加载配置
**Then** 系统 SHALL 将该层视为空配置（等同于默认值），不报错，继续加载其他层级

---

### Requirement: 优先级合并

系统 MUST 按 CLI > 变更 > 项目 > 全局 > 默认值 的优先级合并配置。

#### Scenario: 正常流程 - 多层级定义同一字段

**Given** 默认值 `timeout: 30`，全局配置 `timeout: 60`，项目配置 `timeout: 120`
**When** 系统合并配置
**Then** 系统 MUST 使用项目配置的值，最终 `timeout` 为 120

#### Scenario: 正常流程 - CLI 参数覆盖所有层级

**Given** 全局配置 `format: json`，项目配置 `format: yaml`，CLI 参数 `--format csv`
**When** 系统合并配置
**Then** 系统 MUST 使用 CLI 参数的值，最终 `format` 为 `csv`

#### Scenario: 异常场景 - 高优先级层覆盖低优先级层

**Given** 变更配置 `strict: true`，项目配置 `strict: false`
**When** 系统合并配置
**Then** 系统 MUST 使用变更配置的值，最终 `strict` 为 `true`

#### Scenario: 边界条件 - 仅默认值生效

**Given** 所有层级均未定义 `maxRetries` 字段
**When** 系统合并配置
**Then** 系统 MUST 使用默认值 `maxRetries: 3`

#### Scenario: 边界条件 - 所有层级均定义同一字段

**Given** 默认值 `depth: 1`，全局 `depth: 2`，项目 `depth: 3`，变更 `depth: 4`，CLI `--depth 5`
**When** 系统合并配置
**Then** 系统 MUST 使用最高优先级 CLI 的值，最终 `depth` 为 5

---

### Requirement: 深度合并

系统 SHALL 对对象类型配置进行深度合并，数组和基础类型直接覆盖。

#### Scenario: 正常流程 - 对象类型深度合并

**Given** 全局配置 `server: { host: "localhost", port: 8080 }`，项目配置 `server: { port: 3000 }`
**When** 系统合并配置
**Then** 系统 SHALL 深度合并对象，结果为 `server: { host: "localhost", port: 3000 }`

#### Scenario: 正常流程 - 数组类型直接覆盖

**Given** 全局配置 `plugins: ["a", "b"]`，项目配置 `plugins: ["c"]`
**When** 系统合并配置
**Then** 系统 SHALL 直接覆盖数组，结果为 `plugins: ["c"]`

#### Scenario: 异常场景 - 类型冲突

**Given** 全局配置 `output: "json"`（字符串），项目配置 `output: { format: "json", indent: 2 }`（对象）
**When** 系统合并配置
**Then** 系统 SHALL 使用高优先级层的类型，结果为 `output: { format: "json", indent: 2 }`，并记录警告"字段 output 类型从 string 变更为 object"

#### Scenario: 边界条件 - 嵌套三层对象深度合并

**Given** 全局配置 `a: { b: { c: 1, d: 2 } }`，项目配置 `a: { b: { c: 10 } }`
**When** 系统合并配置
**Then** 系统 SHALL 深度合并至最内层，结果为 `a: { b: { c: 10, d: 2 } }`

#### Scenario: 边界条件 - 空对象与非空对象合并

**Given** 全局配置 `rules: { enabled: true }`，项目配置 `rules: {}`
**When** 系统合并配置
**Then** 系统 SHALL 保留低优先级层的字段，结果为 `rules: { enabled: true }`

---

### Requirement: 配置校验

系统 MUST 使用 Zod schema 校验每层配置的合法性。

#### Scenario: 正常流程 - 配置通过校验

**Given** 项目配置 `strict: true, maxDepth: 5`，Zod schema 定义 `strict: z.boolean(), maxDepth: z.number().min(1).max(10)`
**When** 系统校验该层配置
**Then** 系统 MUST 返回校验通过，配置数据原样保留

#### Scenario: 异常场景 - 字段类型不匹配

**Given** 项目配置 `strict: "yes"`，Zod schema 定义 `strict: z.boolean()`
**When** 系统校验该层配置
**Then** 系统 MUST 返回校验失败，错误信息包含"strict: 期望 boolean，收到 string"

#### Scenario: 异常场景 - 未知字段存在

**Given** 项目配置 `unknownField: "value"`，Zod schema 中未定义 `unknownField`
**When** 系统使用 `strict` 模式校验
**Then** 系统 MUST 返回校验失败，错误信息包含"未知字段: unknownField"

#### Scenario: 边界条件 - 数值超出范围

**Given** 项目配置 `maxDepth: 100`，Zod schema 定义 `maxDepth: z.number().min(1).max(10)`
**When** 系统校验该层配置
**Then** 系统 MUST 返回校验失败，错误信息包含"maxDepth: 值 100 超出范围 [1, 10]"

#### Scenario: 正常流程 - 嵌套对象校验

**Given** 项目配置 `server: { port: 3000 }`，Zod schema 定义 `server: z.object({ port: z.number().min(1).max(65535) })`
**When** 系统校验该层配置
**Then** 系统 MUST 返回校验通过，嵌套对象数据原样保留

---

### Requirement: 配置迁移

系统 SHALL 支持从旧版单一配置自动迁移到三级配置。

#### Scenario: 正常流程 - 旧版配置成功迁移

**Given** 旧版配置文件 `.superspec/config.yaml` 存在，包含全局和项目混合配置
**When** 用户执行配置迁移命令
**Then** 系统 SHALL 将全局相关字段提取到 `~/.superspec/config.yaml`，项目相关字段保留在项目目录 `.superspec/config.yaml`，并生成迁移报告说明字段去向

#### Scenario: 异常场景 - 迁移后备份文件已存在

**Given** 旧版配置文件 `.superspec/config.yaml` 存在，且 `.superspec/config.yaml.bak` 已存在
**When** 用户执行配置迁移命令
**Then** 系统 SHALL 返回错误"备份文件已存在: .superspec/config.yaml.bak，请先手动处理"，不执行迁移

#### Scenario: 正常流程 - 迁移后旧文件保留备份

**Given** 旧版配置文件 `.superspec/config.yaml` 存在
**When** 用户执行配置迁移命令
**Then** 系统 SHALL 将旧文件重命名为 `.superspec/config.yaml.bak`，并创建新的三级配置文件结构

#### Scenario: 边界条件 - 旧版配置为空文件

**Given** 旧版配置文件 `.superspec/config.yaml` 存在但内容为空
**When** 用户执行配置迁移命令
**Then** 系统 SHALL 创建三级配置文件结构（均使用默认值），并记录信息日志"旧配置为空，已生成默认三级配置"

#### Scenario: 异常场景 - 旧版配置包含无法识别的字段

**Given** 旧版配置文件包含已废弃字段 `legacyField: "value"`
**When** 用户执行配置迁移命令
**Then** 系统 SHALL 将无法识别的字段归入项目配置的 `deprecated` 节点下，并在迁移报告中标注"以下字段已废弃，建议手动清理: legacyField"
