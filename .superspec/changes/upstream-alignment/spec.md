# 上游对齐检测

## Purpose

superSpec 在设计上借鉴了 OpenSpec 的校验规则体系和 superpowers-zh 的技能结构框架，但目前缺乏自动化的上游项目变更追踪机制。当上游项目更新规范或调整格式时，superSpec 可能产生无感知的规范漂移，导致兼容性问题或偏离最佳实践。本功能旨在建立系统化的上游对齐检测机制，定期自动检查上游项目的关键文件变化，生成差异报告，区分故意偏离和需要同步的变更，并集成到 CI 流水线中确保 PR 阶段即可发现漂移风险。

## Requirements

### Requirement: 上游源定义注册

系统 SHALL 在 `.superspec/upstream.json` 配置文件中支持注册多个上游源，每个上游源 MUST 包含源名称、仓库地址、分支、追踪的文件路径列表和追踪类型（validation-rule、skill-frontmatter、hook-script）。

#### Scenario: 正常注册多个上游源

Given 用户创建 `.superspec/upstream.json` 文件，内容包含两个上游源：一个指向 OpenSpec 仓库的 validation 规则目录，另一个指向 superpowers-zh 仓库的技能模板目录
When 用户执行 `superspec upstream register`
Then 系统 SHALL 解析并验证 upstream.json 配置文件，确认所有上游源配置合法，并输出注册成功的上游源列表摘要

#### Scenario: upstream.json 文件格式错误

Given `.superspec/upstream.json` 文件中存在 JSON 语法错误，例如缺少逗号或括号不匹配
When 用户执行 `superspec upstream register`
Then 系统 SHALL 输出包含具体语法错误位置的诊断信息，并以非零退出码终止

#### Scenario: 上游源仓库地址不可达

Given `.superspec/upstream.json` 中注册了一个仓库地址为 `https://github.com/invalid/repo` 的上游源
When 用户执行 `superspec upstream fetch` 尝试拉取上游数据
Then 系统 SHALL 对该上游源输出连接失败的错误信息，同时继续处理其他可达的上游源，最终汇总报告中明确标记失败的源

### Requirement: 上游文件自动 Fetch 与本地缓存

系统 SHALL 通过 git 或 HTTP 方式自动获取上游源指定分支的最新文件内容，并将获取的文件缓存到 `.superspec/.upstream-cache/<source-name>/` 目录中。缓存 MUST 记录获取时间戳和 commit hash，避免重复下载。

#### Scenario: 首次获取上游文件成功

Given 用户注册了指向 OpenSpec 仓库 main 分支 validation 规则目录的上游源，本地无缓存
When 用户执行 `superspec upstream fetch`
Then 系统 SHALL 下载指定文件到 `.upstream-cache/openspec/` 目录，记录 commit hash 和时间戳到 `.upstream-cache/openspec/.meta.json`，并输出获取成功的文件列表

#### Scenario: 缓存未过期时跳过重复下载

Given 上游源文件已在 `.upstream-cache/` 中缓存，且缓存时间戳距当前时间不超过配置的 TTL（默认 1 小时）
When 用户再次执行 `superspec upstream fetch`
Then 系统 SHALL 跳过该上游源的下载，并输出提示信息说明缓存仍有效，使用 `--force` 参数可强制刷新

#### Scenario: 网络中断导致获取部分失败

Given 用户注册了三个上游源，获取过程中第二个源的网络连接中断
When 用户执行 `superspec upstream fetch`
Then 系统 SHALL 成功缓存第一个和第三个源的文件，对第二个源输出网络超时错误，并在最终汇总中标记部分成功状态，退出码为非零

### Requirement: 上游差异检测范围

系统 SHALL 检测三类上游漂移：校验规则漂移（validation rules 的新增、删除或逻辑变更）、技能 frontmatter 格式漂移（YAML frontmatter 中必填字段的变化）、Hook 脚本漂移（pre/post hook 脚本签名或行为变更）。

#### Scenario: 检测到校验规则新增

Given 上游 OpenSpec 仓库新增了一条校验规则 `no-double-blank-lines`，本地 superSpec 尚未实现该规则
When 用户执行 `superspec upstream diff --type validation-rule`
Then 系统 SHALL 在差异报告中列出新增规则 `no-double-blank-lines`，标记为"上游新增，待评估"，并附带该规则的上游原始文件内容

#### Scenario: 检测到 frontmatter 必填字段变更

Given 上游 superpowers-zh 的技能模板 frontmatter 中新增了必填字段 `compatibility`，而本地 superSpec 的技能文件未包含该字段
When 用户执行 `superspec upstream diff --type skill-frontmatter`
Then 系统 SHALL 在差异报告中标记该字段为"上游新增必填字段"，并列出所有受影响的本地技能文件清单

#### Scenario: Hook 脚本无变化

Given 上游仓库的 hook 脚本自上次检查以来未发生任何变更，本地缓存的 commit hash 与上游最新 commit hash 相同
When 用户执行 `superspec upstream diff --type hook-script`
Then 系统 SHALL 输出"hook 脚本无变化"的摘要信息，差异报告中该类别为空

### Requirement: 差异报告生成与分类

系统 SHALL 生成结构化的差异报告，将每个差异项分类为"故意偏离"、"需要同步"或"待评估"三类。用户 MUST 能够通过配置文件 `.superspec/upstream-overrides.json` 将特定差异标记为故意偏离，后续检测时自动跳过。

#### Scenario: 生成完整差异报告

Given 上游有 3 项规则变更、2 项 frontmatter 变更、1 项 hook 变更，其中 1 项规则已被用户在 upstream-overrides.json 中标记为故意偏离
When 用户执行 `superspec upstream diff --report`
Then 系统 SHALL 生成包含 5 项差异的报告（排除已标记故意偏离的 1 项），每项包含差异类型、上游文件路径、本地对应路径、具体差异内容和建议操作

#### Scenario: 差异报告输出为 JSON 格式

Given 用户指定输出格式为 JSON
When 用户执行 `superspec upstream diff --report --format json`
Then 系统 SHALL 输出符合 `.superspec/schemas/upstream-report.json` schema 定义的 JSON 报告，包含 reportDate、sourceSummaries、diffItems 数组，每个 diffItem 包含 category、type、upstreamPath、localPath、diffContent 和 suggestedAction 字段

#### Scenario: upstream-overrides.json 配置格式错误

Given `.superspec/upstream-overrides.json` 中将一个差异项的 category 设置为无效值 `"ignore-all"`
When 用户执行 `superspec upstream diff`
Then 系统 SHALL 输出该 override 条目的校验错误信息，提示有效值为 `intentional`、`needs-sync`、`pending-review`，并继续处理其他有效的 override 条目

### Requirement: CI 集成与 PR 检测

系统 SHALL 提供 `superspec upstream ci-check` 命令用于 CI 流水线集成。该命令 MUST 在检测到未处理的上游漂移时以非零退出码终止，阻断 PR 合并，并输出可作为 PR 评论的差异摘要。

#### Scenario: CI 检测到未处理的漂移

Given CI 环境中执行 `superspec upstream ci-check`，上游存在 2 项未被 upstream-overrides.json 标记的差异
When 命令执行完成
Then 系统 SHALL 以非零退出码终止，输出包含 2 项差异摘要的文本，格式适合作为 GitHub PR 评论，并在环境变量 `SUPERSPEC_UPSTREAM_DRIFT_COUNT` 中设置漂移数量

#### Scenario: CI 检测无漂移

Given 上游所有文件与本地一致，或所有差异均已在 upstream-overrides.json 中标记为故意偏离
When 用户执行 `superspec upstream ci-check`
Then 系统 SHALL 以零退出码正常结束，输出"上游对齐检查通过"的摘要信息

#### Scenario: CI 环境中网络不可用

Given CI 环境的网络策略禁止访问外部仓库，导致无法获取上游文件
When 用户执行 `superspec upstream ci-check`
Then 系统 SHALL 检测缓存目录是否存在有效的本地缓存，若存在则使用缓存执行检测并输出警告说明使用了离线缓存，若不存在则以非零退出码终止并输出网络不可用的错误信息
