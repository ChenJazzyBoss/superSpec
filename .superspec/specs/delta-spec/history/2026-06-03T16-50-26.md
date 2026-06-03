# Delta Spec

## Purpose

Delta Spec 是 superSpec 的增量变更能力，用于精确描述相对于基准 spec 的变更内容。通过 ADDED、MODIFIED、REMOVED、RENAMED 四种操作类型，Delta spec 以声明式方式表达"改了什么"而非"最终是什么"，使变更具有可追溯性、可校验性和可合并性。系统对 Delta spec 执行格式校验、语义校验和冲突检测三重检查，并通过顺序合并算法将变更应用到基准 spec，生成完整的合并结果。

## Requirements

### Requirement: 操作类型

系统 SHALL 支持 ADDED、MODIFIED、REMOVED、RENAMED 四种 Delta 操作，每种操作对应一种明确的变更语义。

#### Scenario: 正常流程-使用 ADDED 操作添加新条目

Given 用户需要向基准 spec 中添加一条新的 requirement
When 用户创建 Delta spec 并使用 ADDED 操作类型标记该 requirement
Then 系统 SHALL 识别该操作为新增操作
And 系统 SHALL 在合并时将该 requirement 追加到基准 spec 中

#### Scenario: 正常流程-使用 REMOVED 操作删除已有条目

Given 基准 spec 中存在一条 requirement，用户需要将其移除
When 用户创建 Delta spec 并使用 REMOVED 操作类型标记该 requirement 的路径
Then 系统 SHALL 识别该操作为删除操作
And 系统 SHALL 在合并时从基准 spec 中移除该 requirement

#### Scenario: 异常场景-使用不支持的操作类型

Given 用户在 Delta spec 中使用了系统未定义的操作类型（如 DELETED 或 CHANGED）
When 系统对该 Delta spec 进行格式校验
Then 系统 SHALL 拒绝该 Delta spec
And 系统 SHALL 输出错误信息指出不支持的操作类型
And 系统 SHALL 列出所有合法的操作类型供用户参考

#### Scenario: 边界条件-同时使用多种操作类型

Given 用户在一个 Delta spec 中同时包含 ADDED、MODIFIED、REMOVED 和 RENAMED 四种操作
When 系统对该 Delta spec 进行校验和合并
Then 系统 SHALL 接受包含多种操作类型的 Delta spec
And 系统 SHALL 按照操作在 Delta spec 中的声明顺序依次应用每种操作

### Requirement: 格式校验

系统 MUST 校验 Delta Spec 的结构完整性，确保每个 Delta 操作包含所有必需字段且字段类型正确。

#### Scenario: 正常流程-Delta spec 包含完整的必需字段

Given 用户提交的 Delta spec 中每个操作都包含 operation、path、content 等必需字段
When 系统执行格式校验
Then 系统 SHALL 验证所有字段存在且类型正确
And 系统 SHALL 返回格式校验通过的结果

#### Scenario: 异常场景-Delta 操作缺少必需字段

Given 用户提交的 Delta spec 中某个操作缺少 path 字段
When 系统执行格式校验
Then 系统 SHALL 检测到缺失的必需字段
And 系统 SHALL 返回格式校验失败的结果
And 系统 SHALL 指出具体哪个操作的哪个字段缺失

#### Scenario: 边界条件-Delta spec 为空操作列表

Given 用户提交的 Delta spec 包含空的操作列表（零个操作）
When 系统执行格式校验
Then 系统 SHALL 接受空操作列表作为合法的 Delta spec
And 系统 SHALL 将其视为无变更的 Delta，合并结果等同于基准 spec

### Requirement: 语义校验

系统 SHALL 校验 Delta Spec 与基准 Spec 的语义一致性，确保 Delta 操作的目标在基准 spec 中存在且操作语义合法。

#### Scenario: 正常流程-MODIFIED 操作的目标存在于基准 spec

Given 基准 spec 中存在一条 id 为 "requirement-1" 的 requirement
When 用户创建 Delta spec 使用 MODIFIED 操作修改该 requirement
Then 系统 SHALL 验证修改目标在基准 spec 中存在
And 系统 SHALL 返回语义校验通过的结果

#### Scenario: 异常场景-REMOVED 操作的目标不存在于基准 spec

Given 基准 spec 中不存在 id 为 "requirement-99" 的 requirement
When 用户创建 Delta spec 使用 REMOVED 操作删除该 requirement
Then 系统 SHALL 检测到删除目标不存在
And 系统 SHALL 返回语义校验失败的结果
And 系统 SHALL 指出被引用的条目在基准 spec 中未找到

#### Scenario: 边界条件-ADDED 操作的条目与基准 spec 已有条目同名

Given 基准 spec 中已存在一条名称为 "用户认证" 的 requirement
When 用户创建 Delta spec 使用 ADDED 操作添加同名的 requirement
Then 系统 SHALL 检测到名称冲突
And 系统 SHALL 在语义校验中发出警告
And 系统 SHALL 建议用户使用 MODIFIED 操作替代或更改新条目的名称

### Requirement: 冲突检测

系统 MUST 检测同一 Delta 中的矛盾操作和路径冲突，防止合并时产生不确定的结果。

#### Scenario: 正常流程-Delta 中无冲突操作

Given 用户提交的 Delta spec 中包含 ADDED 新条目和 MODIFIED 已有条目两个操作，且两个操作的目标路径互不相关
When 系统执行冲突检测
Then 系统 SHALL 未检测到任何冲突
And 系统 SHALL 返回冲突检测通过的结果

#### Scenario: 异常场景-同一路径同时出现 REMOVED 和 MODIFIED

Given 用户提交的 Delta spec 中对同一路径先执行 REMOVED 操作再执行 MODIFIED 操作
When 系统执行冲突检测
Then 系统 SHALL 检测到矛盾操作
And 系统 SHALL 返回冲突检测失败的结果
And 系统 SHALL 指出冲突的路径和涉及的矛盾操作

#### Scenario: 边界条件-ADDED 操作与 RENAMED 操作产生路径冲突

Given 用户提交的 Delta spec 中 RENAMED 操作将条目从路径 A 移动到路径 B，同时 ADDED 操作在路径 B 创建新条目
When 系统执行冲突检测
Then 系统 SHALL 检测到目标路径冲突
And 系统 SHALL 返回冲突检测失败的结果
And 系统 SHALL 指出路径 B 被多个操作同时占用

### Requirement: 合并算法

系统 SHALL 将 Delta 操作顺序应用到基准 Spec，生成合并结果，确保合并过程的确定性和可重复性。

#### Scenario: 正常流程-单个 Delta 顺序合并

Given 基准 spec 包含 3 条 requirement，用户提交的 Delta spec 包含 1 个 ADDED 操作和 1 个 MODIFIED 操作
When 系统执行合并算法
Then 系统 SHALL 按 Delta 中的操作顺序依次应用
And 系统 SHALL 生成包含 4 条 requirement 的合并结果
And 合并结果中被 MODIFIED 的 requirement 内容已更新

#### Scenario: 异常场景-合并过程中遇到无效操作

Given 基准 spec 包含 2 条 requirement，用户提交的 Delta spec 包含 3 个操作，其中第 2 个操作引用了不存在的路径
When 系统执行合并算法
Then 系统 SHALL 成功应用第 1 个操作
And 系统 SHALL 在第 2 个操作处暂停合并
And 系统 SHALL 报告合并失败的位置和原因
And 系统 SHALL 保留已成功应用的操作结果

#### Scenario: 边界条件-多个 Delta 文件按时间顺序合并

Given 用户提交了 3 个 Delta spec 文件，分别标记为 delta-1、delta-2、delta-3
When 系统按时间顺序执行批量合并
Then 系统 SHALL 先将 delta-1 合并到基准 spec
And 系统 SHALL 将 delta-2 合并到 delta-1 的合并结果上
And 系统 SHALL 将 delta-3 合并到 delta-2 的合并结果上
And 最终结果 SHALL 等同于三个 Delta 按顺序依次应用的效果
