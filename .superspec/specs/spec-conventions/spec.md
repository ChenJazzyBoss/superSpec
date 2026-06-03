# Spec 编写规范

## Purpose

Spec 编写规范定义了 superSpec 中"什么样的 spec 是好 spec"的评判标准和编写约束。Spec 文件是系统能力的行为契约，用于描述系统能够做什么、在什么条件下做出什么响应，而非描述系统内部如何实现这些能力。该规范确保所有 spec 都遵循统一的结构化格式、通过严格的质量校验、支持增量变更管理，并按能力域进行组织，从而保证 spec 的可读性、可验证性和可维护性。

## Requirements

### Requirement: 行为契约规范

Spec SHALL 描述可观察的用户行为和系统响应，而非内部实现细节。每条 requirement 聚焦于用户或外部系统可以验证的外在表现，禁止包含具体的代码结构、算法选择、数据存储方案等实现层面的描述。

#### Scenario: 正常流程-描述可观察行为

Given 用户正在编写一条关于"登录功能"的 requirement
When 用户描述该 requirement 的内容
Then requirement SHALL 只包含可观察的行为描述，例如：
- "用户输入正确的用户名和密码后，系统 SHALL 返回登录成功的响应"
- "用户输入错误的密码时，系统 SHALL 返回认证失败的错误信息"
And requirement SHALL NOT 包含实现细节，例如：
- "系统使用 bcrypt 算法对密码进行哈希"
- "用户信息存储在 PostgreSQL 的 users 表中"

#### Scenario: 异常场景-检测实现细节泄露

Given 用户提交的 spec 中包含实现细节描述
When 系统对该 spec 进行行为契约校验
Then 系统 SHALL 识别出包含实现细节的 requirement
And 系统 SHALL 标记为校验错误
And 系统 SHALL 提供具体的违规位置和修改建议

#### Scenario: 边界条件-技术术语的合理使用

Given 用户需要描述一个涉及特定技术概念的行为
When 用户在 requirement 中使用技术术语
Then 系统 SHALL 允许使用通用的技术概念术语（如 HTTP、JSON、OAuth）
And 系统 SHALL 禁止使用特定实现库或框架的名称（如 Express、Mongoose）
And 系统 SHALL 区分"接口契约"（允许）和"实现选择"（禁止）

### Requirement: 结构化格式

Spec MUST 使用标准的三段式结构：Purpose、Requirements、Scenarios。Purpose 说明 spec 的整体意图，Requirements 列出具体的能力建条目，每条 Requirement 下使用 Given/When/Then 格式的 Scenario 描述具体的行为场景。

#### Scenario: 正常流程-标准三段式结构

Given 用户创建一个新的 spec 文件
When 用户按照标准格式编写内容
Then spec 文件 SHALL 包含以下结构：
- `# <功能名称>` 作为一级标题
- `## Purpose` 段落，描述 spec 的整体意图
- `## Requirements` 段落，包含一个或多个 `### Requirement: <需求名称>`
- 每个 Requirement 下包含 `#### Scenario: <场景名称>`，使用 Given/When/Then 格式

#### Scenario: 异常场景-缺少必需结构段落

Given 用户提交的 spec 文件缺少 Purpose 段落
When 系统对该 spec 进行格式校验
Then 系统 SHALL 报告缺少必需的结构段落
And 系统 SHALL 指明缺失的段落名称
And 系统 SHALL 将该问题标记为 ERROR 级别

#### Scenario: 边界条件-Scenario 格式不规范

Given 用户的 Scenario 使用了非标准的描述格式（如纯文本叙述而非 Given/When/Then）
When 系统对该 spec 进行格式校验
Then 系统 SHALL 识别出格式不规范的 Scenario
And 系统 SHALL 标记为 WARNING 级别
And 系统 SHALL 提供标准格式的参考示例

### Requirement: 质量校验

Spec MUST 通过双层校验机制的质量检查，包括结构层的 Zod Schema 校验和语义层的规则引擎校验。只有在两层校验均无 ERROR 级别问题时，spec 才被视为合格。

#### Scenario: 正常流程-通过双层校验

Given 用户提交一份格式正确且语义合理的 spec
When 系统执行双层校验
Then 第一层 Zod Schema 校验 SHALL 验证 spec 的结构完整性和类型正确性
And 第二层规则引擎校验 SHALL 验证 spec 的语义合理性和业务规则合规性
And 系统 SHALL 返回校验通过的结果，无 ERROR 级别问题

#### Scenario: 异常场景-Zod Schema 校验失败

Given 用户提交的 spec 存在结构错误（如 requirement 缺少 SHALL/MUST 关键词）
When 系统执行第一层 Zod Schema 校验
Then 系统 SHALL 检测到结构错误
And 系统 SHALL 返回 ERROR 级别的校验结果
And 系统 SHALL 不执行第二层规则引擎校验
And 系统 SHALL 提供具体的错误位置和修复建议

#### Scenario: 边界条件-规则引擎校验发现语义问题

Given 用户提交的 spec 通过了 Zod Schema 校验但存在语义问题（如 Purpose 不足 50 字）
When 系统执行第二层规则引擎校验
Then 系统 SHALL 检测到语义层面的问题
And 系统 SHALL 根据问题严重程度标记为 ERROR 或 WARNING
And 系统 SHALL 提供详细的语义分析结果和改进建议

### Requirement: 增量变更支持

Spec SHALL 支持通过 Delta spec 进行增量变更描述。Delta spec 使用 ADDED、MODIFIED、REMOVED 三种操作类型，精确描述相对于基准 spec 的变更内容，实现变更的可追溯性和可合并性。

#### Scenario: 正常流程-通过 Delta 添加新 requirement

Given 用户需要向现有 spec 中添加一条新的 requirement
When 用户创建 Delta spec 描述该变更
Then Delta spec SHALL 使用 ADDED 操作类型
And Delta spec SHALL 包含新增 requirement 的完整内容
And 系统 SHALL 将该 requirement 合并到基准 spec 中生成新的完整 spec

#### Scenario: 异常场景-Delta 操作与基准 spec 冲突

Given 用户创建的 Delta spec 尝试 ADDED 一个已存在的 requirement
When 系统执行 Delta 合并操作
Then 系统 SHALL 检测到操作冲突
And 系统 SHALL 暂停合并过程
And 系统 SHALL 提供冲突的详细信息和解决建议

#### Scenario: 边界条件-批量 Delta 合并

Given 用户提交了多个按时间顺序排列的 Delta spec
When 系统执行批量合并操作
Then 系统 SHALL 按顺序依次应用每个 Delta
And 系统 SHALL 在应用每个 Delta 前验证其与当前状态的兼容性
And 系统 SHALL 在任一 Delta 合并失败时暂停并保留已合并的进度
And 系统 SHALL 提供完整的合并日志

### Requirement: 能力域组织

Spec MUST 按能力域（capability domain）进行组织。每个能力域对应一个独立的目录，目录名称使用 kebab-case 格式。每个目录下包含该能力域的 spec.md 文件及相关文档。

#### Scenario: 正常流程-按能力域创建 spec 目录

Given 用户需要为一个新的能力域"用户认证"创建 spec
When 用户创建对应的目录和文件
Then 目录名称 SHALL 使用 kebab-case 格式（如 `user-authentication`）
And 目录下 SHALL 包含 `spec.md` 作为该能力域的主 spec 文件
And 目录路径 SHALL 遵循 `.superspec/specs/<capability-domain>/` 的组织结构

#### Scenario: 异常场景-目录命名不符合规范

Given 用户创建的 spec 目录名称使用了非 kebab-case 格式（如 `UserAuthentication` 或 `user_authentication`）
When 系统对目录结构进行校验
Then 系统 SHALL 识别出命名不规范的目录
And 系统 SHALL 标记为 WARNING 级别
And 系统 SHALL 建议使用 kebab-case 格式的目录名称

#### Scenario: 边界条件-能力域嵌套层级

Given 用户需要组织一个多层级的能力域结构（如"认证"下的"OAuth"和"JWT"）
When 用户创建嵌套的目录结构
Then 系统 SHALL 允许一级嵌套（如 `specs/authentication/oauth/`）
And 系统 SHALL 限制最大嵌套深度为两级
And 超过嵌套深度限制时系统 SHALL 标记为 WARNING 并建议扁平化组织
