# Delta Spec 模型

## Purpose

superSpec 当前仅支持全量 Spec 描述，无法有效表达增量变更。Delta Spec 模型旨在提供一种标准化的增量变更描述格式，支持 ADDED、MODIFIED、REMOVED、RENAMED 四种操作类型。通过 Delta Spec，用户可以精确描述相对于基准 Spec 的变更内容，实现变更的可追溯性和可合并性。该模型将与现有 spec-parser 集成，支持冲突检测、校验规则和合并算法，为 Spec 的版本管理和协作编辑提供基础能力。

## Requirements

### Requirement: Delta Spec 格式定义

系统 SHALL 定义标准化的 Delta Spec 格式，支持 ADDED、MODIFIED、REMOVED、RENAMED 四种操作类型，每种操作类型都有明确的语义和结构要求。

#### Scenario: ADDED 操作格式

Given 用户需要向 Spec 中添加新的 requirement
When 用户创建 Delta Spec 描述该变更
Then 系统 SHALL 要求 ADDED 操作包含以下字段：
- `operation`: "ADDED"
- `path`: 添加位置的路径（如 "requirements.new-req"）
- `content`: 新增内容的完整描述
- `metadata`: 可选的变更元数据（作者、时间、原因）

#### Scenario: MODIFIED 操作格式

Given 用户需要修改现有 requirement 的内容
When 用户创建 Delta Spec 描述该变更
Then 系统 SHALL 要求 MODIFIED 操作包含以下字段：
- `operation`: "MODIFIED"
- `path`: 被修改内容的路径
- `before`: 修改前的内容快照
- `after`: 修改后的内容
- `metadata`: 可选的变更元数据

#### Scenario: REMOVED 操作格式

Given 用户需要从 Spec 中删除某个 requirement
When 用户创建 Delta Spec 描述该变更
Then 系统 SHALL 要求 REMOVED 操作包含以下字段：
- `operation`: "REMOVED"
- `path`: 被删除内容的路径
- `content`: 被删除内容的快照（用于审计和回滚）
- `metadata`: 可选的变更元数据

#### Scenario: RENAMED 操作格式

Given 用户需要重命名 Spec 中的某个元素
When 用户创建 Delta Spec 描述该变更
Then 系统 SHALL 要求 RENAMED 操作包含以下字段：
- `operation`: "RENAMED"
- `oldPath`: 原始路径
- `newPath`: 新路径
- `metadata`: 可选的变更元数据

### Requirement: Delta 合并算法

系统 SHALL 实现可靠的合并算法，将 Delta Spec 应用到基准 Spec 上，生成新的完整 Spec，确保合并过程的正确性和可逆性。

#### Scenario: 顺序合并多个 Delta

Given 基准 Spec 和多个按时间顺序排列的 Delta Spec
When 系统执行合并操作
Then 系统 SHALL：
- 按照 Delta 的顺序依次应用每个变更
- 在应用每个 Delta 前验证其与当前状态的兼容性
- 生成新的完整 Spec 作为合并结果
- 记录合并过程中的所有操作日志

#### Scenario: 合并冲突处理

Given 两个 Delta Spec 修改了同一 requirement 的同一字段
When 系统尝试合并这两个 Delta
Then 系统 SHALL：
- 检测到合并冲突
- 暂停合并过程
- 提供冲突的详细信息（路径、两个 Delta 的修改内容）
- 要求用户手动解决冲突或选择优先级

#### Scenario: 合并回滚支持

Given 合并后的 Spec 存在问题需要回滚
When 用户请求回滚到合并前的状态
Then 系统 SHALL：
- 保留合并前的基准 Spec 快照
- 支持撤销最近一次合并操作
- 恢复到合并前的完整状态
- 提供回滚操作的审计日志

### Requirement: 冲突检测机制

系统 SHALL 自动检测 Delta Spec 中的逻辑冲突，如同一 requirement 不能同时被 ADDED 和 REMOVED，确保 Delta 的语义一致性。

#### Scenario: 同一元素的矛盾操作检测

Given Delta Spec 中包含对同一 requirement 的 ADDED 和 REMOVED 操作
When 系统执行冲突检测
Then 系统 SHALL：
- 识别出这两个操作存在逻辑矛盾
- 标记为严重冲突（error）
- 提供冲突的详细位置和操作信息
- 阻止该 Delta 的应用直到冲突解决

#### Scenario: 依赖关系冲突检测

Given Delta Spec 中 REMOVED 一个被其他 requirement 依赖的元素
When 系统执行冲突检测
Then 系统 SHALL：
- 检测到依赖关系冲突
- 标记为警告（warning）
- 列出所有受影响的依赖项
- 建议用户先处理依赖关系再执行删除

#### Scenario: 路径冲突检测

Given Delta Spec 中的 RENAMED 操作导致路径冲突
When 系统执行冲突检测
Then 系统 SHALL：
- 检测目标路径是否已存在
- 检测是否存在循环引用
- 如果存在冲突，提供详细的冲突路径信息
- 建议替代的命名方案

### Requirement: Delta 校验规则

系统 SHALL 对 Delta Spec 执行严格的格式和语义校验，确保 Delta 的有效性和可应用性。

#### Scenario: 格式校验

Given 用户提交的 Delta Spec 文件
When 系统执行格式校验
Then 系统 SHALL 验证：
- Delta 文件是否符合 JSON Schema 定义
- 必需字段是否存在且类型正确
- 操作类型是否在允许的枚举值中
- 路径格式是否符合规范

#### Scenario: 语义校验

Given 格式正确的 Delta Spec
When 系统执行语义校验
Then 系统 SHALL 验证：
- ADDED 操作的目标路径在基准 Spec 中不存在
- MODIFIED 操作的目标路径在基准 Spec 中存在
- REMOVED 操作的目标路径在基准 Spec 中存在
- RENAMED 操作的新路径在基准 Spec 中不存在

#### Scenario: 业务规则校验

Given 语义正确的 Delta Spec
When 系统执行业务规则校验
Then 系统 SHALL 验证：
- 新增的 requirement 是否包含必需字段（Purpose、Requirements）
- 修改后的内容是否仍符合 Spec 模板规范
- 删除操作是否会导致 Spec 结构不完整
- 重命名操作是否遵循命名规范

### Requirement: 与 spec-parser 集成

系统 SHALL 将 Delta Spec 能力无缝集成到现有的 spec-parser 中，支持 Delta 的解析、验证和应用，保持与现有 API 的兼容性。

#### Scenario: Delta 解析集成

Given 用户提供 Delta Spec 文件路径
When spec-parser 解析该文件
Then 系统 SHALL：
- 自动识别文件为 Delta Spec 格式
- 使用专用的 Delta 解析器处理
- 返回结构化的 Delta 对象
- 保持与现有 Spec 解析结果的接口一致性

#### Scenario: Delta 验证集成

Given spec-parser 解析完成 Delta Spec
When 用户调用验证 API
Then 系统 SHALL：
- 执行完整的 Delta 校验流程
- 返回详细的验证结果（包括错误和警告）
- 支持增量验证（仅验证变更部分）
- 提供与现有验证 API 一致的返回格式

#### Scenario: Delta 应用集成

Given 验证通过的 Delta Spec 和基准 Spec
When 用户调用合并 API
Then 系统 SHALL：
- 执行 Delta 合并算法
- 返回合并后的完整 Spec
- 支持批量合并多个 Delta
- 提供合并过程的详细日志
- 保持与现有 Spec 对象的完全兼容性
