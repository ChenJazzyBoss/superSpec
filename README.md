# superSpec

AI 原生的规格说明书管理工具，专为 Claude Code 设计。

superSpec 不只是校验工具——它是一套完整的 AI 编码方法论，从需求收集到代码归档，覆盖整个开发生命周期。

## 核心理念

| 维度 | 传统做法 | superSpec 做法 |
|------|---------|---------------|
| 需求 | 口头沟通、散落文档 | 结构化 spec，程序化校验 |
| 计划 | 脑中构思 | 详细实现计划，每步有代码 |
| 验证 | "应该没问题" | 证据驱动，必须运行命令 |
| 归档 | 直接改文件 | Delta 变更 + 归档记录 |
| AI 行为 | 自由发挥 | 技能 + 红线 + 检查清单 |

## 什么是 spec？

spec（规格说明书）是功能的结构化定义：

```markdown
# 批量导出

## Purpose

系统需要支持将数据批量导出为多种格式（CSV、XLSX、PDF），
满足不同业务场景下的数据流转需求。

## Requirements

### Requirement: 导出格式支持
系统 SHALL 支持 CSV、XLSX 和 PDF 三种导出格式。

#### Scenario: 正常流程-CSV 导出
Given 用户在数据列表页面
When 选择 CSV 格式并点击导出
Then 系统生成 CSV 文件并下载

#### Scenario: 异常场景-导出失败
Given 用户在数据列表页面
When 导出过程中发生错误
Then 系统显示错误提示并记录日志

#### Scenario: 边界条件-空数据导出
Given 用户在数据列表页面且数据为空
When 选择任意格式并点击导出
Then 系统提示"无数据可导出"
```

## 快速开始

### 安装

```bash
npm install -g superspec
```

### 初始化项目

```bash
npx superspec init
```

这会在当前目录创建：

```
.superspec/              # superSpec 工作目录
├── config.yaml          # 项目配置
├── scripts/
│   └── validate.js      # 校验脚本（可独立运行）
├── specs/               # 能力行为契约（活文档）
├── changes/             # 进行中的变更
├── archive/             # 已完成的变更
└── templates/
    └── spec-template.md # spec 模板

.claude/                 # Claude Code 集成
├── skills/              # 11 个技能
└── hooks/               # 会话启动 hook

CLAUDE.md                # Claude Code 上下文注入
```

### 基本使用

```bash
# 生成 spec（在 Claude Code 中）
/superspec:generate-spec

# 校验 spec
node .superspec/scripts/validate.js .superspec/specs/my-feature/spec.md

# 严格模式（WARNING 也导致失败）
node .superspec/scripts/validate.js .superspec/specs/my-feature/spec.md --strict
```

## 技能体系

superSpec 提供 11 个 Claude Code 技能，覆盖开发生命周期的每个阶段：

### 需求阶段

| 技能 | 用途 | 风险等级 |
|------|------|---------|
| `brainstorm` | 通过提问收集需求，生成结构化 spec | 低 |
| `generate-spec` | 将需求转化为结构化 spec | 高 |
| `validate-spec` | 校验 spec 格式和内容质量 | 中 |
| `update-spec` | 增量更新 spec | 低 |

### 计划阶段

| 技能 | 用途 | 风险等级 |
|------|------|---------|
| `write-plan` | 将 spec 转换为详细实现计划 | 高 |

### 实现阶段

| 技能 | 用途 | 风险等级 |
|------|------|---------|
| `tdd` | spec 感知的测试驱动开发 | 低 |
| `subagent-dev` | 子代理驱动开发，每个任务双 review | 最高 |
| `debug` | spec 感知的系统化调试 | 高 |

### 验证阶段

| 技能 | 用途 | 风险等级 |
|------|------|---------|
| `verify` | 证据驱动的完成验证 | 高 |
| `generate-test` | 生成测试代码骨架 | 低 |

### 归档阶段

| 技能 | 用途 | 风险等级 |
|------|------|---------|
| `archive` | 变更归档，delta 合并到 specs/ | 高 |

### 反合理化设计

每个高风险技能都包含：

- **跳步红线表** — 常见借口 → 现实对照
- **完成检查清单** — 必须完成才能结束
- **XML 标签约束** — HARD-GATE、EXTREMELY-IMPORTANT、SUBAGENT-STOP

```markdown
## 跳步红线

| 跳步借口 | 现实 |
|----------|------|
| "子代理说完成了，应该没问题" | 子代理可能幻觉完成，必须验证 |
| "这个任务很简单，不需要审查" | 简单任务也会出错，审查不能跳 |

## 完成检查清单

- [ ] 每个任务都经过三步审查
- [ ] spec 合规审查运行了 superspec validate
- [ ] 所有审查 FAIL 都有对应的修复循环
```

## 校验系统

### 双层校验

1. **Zod Schema** — 结构校验（字段类型、必填、格式）
2. **规则引擎** — 业务逻辑校验（质量检查、模糊词检测）

### 内置规则（9 条）

| 规则 | 级别 | 说明 |
|------|------|------|
| `require-shall` | ERROR | 需求文本必须包含 SHALL 或 MUST |
| `min-scenarios` | ERROR | 每个需求至少 2 个验收场景 |
| `unique-req-names` | ERROR | 需求名称不能重复 |
| `unique-scenario-names` | ERROR | 同需求下场景名称不能重复 |
| `no-vague-words` | WARNING | 禁用模糊词汇（尽快、多种、适当等） |
| `scenario-types` | WARNING | 场景类型应覆盖正常 + 异常 + 边界 |
| `overview-length` | INFO | Purpose 建议 100+ 字符 |
| `testability` | INFO | 需求应可测试，避免主观性描述 |
| `recommended-scenarios` | WARNING | 推荐每需求 3+ 个场景 |

### 场景类型检测

规则引擎支持智能场景分类，排除否定语境和描述性文本的误匹配：

- "不产生任何错误信息" → 正常流程（否定语境）
- "捕获异常并记录日志" → 正常流程（描述性文本）
- "密码错误时显示提示" → 异常场景（真正的 error-case）

## 图表系统

superSpec 使用 Mermaid 格式生成图表，嵌入到 spec 和计划中：

### 4 种图表

| 类型 | 用途 | 生成时机 |
|------|------|---------|
| `flowchart` | 任务分解结构 | generate-spec、write-plan |
| `stateDiagram-v2` | 状态流转图 | validate-spec |
| `decision` | 决策流程图 | validate-spec |
| `test-coverage` | 测试覆盖矩阵 | generate-test |

图表通过 `<!-- DIAGRAM:type -->` 占位符嵌入 Markdown，VS Code 原生预览支持。

## Delta 变更系统

### 概念

Delta 是相对于基准 spec 的增量变更描述，支持 4 种操作：

- **ADDED** — 新增需求/场景
- **MODIFIED** — 修改需求/场景内容
- **REMOVED** — 删除需求/场景
- **RENAMED** — 重命名需求

### 工作流

```
specs/          ← 能力行为契约（活文档，持续增长）
changes/        ← 进行中的变更（delta spec）
archive/        ← 已完成的变更（归档记录）
```

1. 创建变更：`changes/<name>/delta.json`
2. 实现变更：编写代码、测试
3. 归档变更：delta 自动合并到 `specs/`
4. 校验结果：合并后 strict 校验，失败则阻断

### Markdown 合并器

v7 新增章节级 Markdown 合并器，支持：

- 按标题层级解析 spec
- 路径格式查找（`父章节/子章节`）
- 删除父章节时连带子章节
- 合并后自动校验

## 配置系统

### 3 层配置

```
全局配置 (~/.superspec/config.yaml)
  ↓ 继承
项目配置 (.superspec/config.yaml)
  ↓ 继承
变更配置 (.superspec/changes/<name>/config.yaml)
```

优先级：CLI 参数 > 变更配置 > 项目配置 > 全部配置

### 配置项

```yaml
# 校验配置
validation:
  strictMode: false        # 严格模式（WARNING 也失败）
  minScenarios: 2          # 最少场景数
  recommendedScenarios: 3  # 推荐场景数
  purposeMinLength: 50     # Purpose 最小长度

# 归档配置
archive:
  autoMerge: true          # 归档时自动合并 delta
  validateAfterMerge: true # 合并后自动校验

# 图表配置
diagrams:
  enabled: true            # 是否生成图表
  format: mermaid          # 图表格式
```

## XML 标签约束

在 SKILL.md 中使用 XML 标签约束 AI 行为：

```markdown
<HARD-GATE>
没有新鲜验证证据 = 不允许声明完成
没有例外，没有"就这一次"
</HARD-GATE>

<EXTREMELY-IMPORTANT>
你必须按顺序完成以下步骤：
</EXTREMELY-IMPORTANT>

<SUBAGENT-STOP>
如果你是作为子智能体被分派来执行特定任务的，跳过此技能。
</SUBAGENT-STOP>

## 完成检查清单
- [ ] 步骤 1 已完成
- [ ] 步骤 2 已完成
```

### 4 种标签

| 标签 | 作用 | 优先级 |
|------|------|--------|
| `HARD-GATE` | 条件不满足时阻断执行 | 最高 |
| `CHECKLIST` | 顺序完成检查项 | 高 |
| `EXTREMELY-IMPORTANT` | 强调显示 | 中 |
| `SUBAGENT-STOP` | 子代理跳过 | 低 |

## 反合理化系统

防止 AI 跳步或美化未完成的工作：

### 5 个组件

1. **红线表** — 跳步借口 → 现实对照
2. **检查清单** — 顺序完成强制
3. **证据验证** — 声明必须有证据支撑
4. **Skill Guard** — 集成所有反合理化组件
5. **模式库** — 常见跳步模式检测

### 红线检测

```typescript
// 关键词匹配 + 正则回退
detectRedFlag("应该没问题了", redFlags)
// → { detected: true, excuse: "应该没问题了", reality: "运行验证命令" }
```

## 管道系统

### 7 阶段工作流

```
brainstorm → generate-spec → validate-spec → write-plan → implement → verify → archive
```

每个阶段有：

- **前置条件** — 必须满足才能开始
- **后置条件** — 必须满足才能结束
- **重试策略** — 失败时的处理方式
- **上下文传递** — 阶段间的数据流转

### 变更工作流

```
draft → in-progress → review → done → archived
```

5 状态机，支持状态转换验证和任务管理。

## CLI 命令

```bash
# 初始化
superspec init              # 初始化项目骨架
superspec init --interactive # 交互式配置
superspec init --ci         # 初始化并生成 CI workflow

# 校验
superspec validate <name>   # 校验单个 spec
superspec ci                # 批量校验所有 spec
superspec ci --strict       # 严格模式
superspec ci --json         # JSON 输出

# 变更
superspec update <name>     # 增量更新 spec（Delta Merge）
superspec update <name> --file delta.json
superspec changes           # 列出进行中的变更
superspec archive <name>    # 归档完成的变更

# 代码生成
superspec generate <name>   # 生成测试代码骨架
superspec generate <name> --lang typescript
superspec generate <name> --lang python

# 版本追踪
superspec history <name>    # 查看历史快照
superspec diff <name>       # 对比当前与历史版本

# 维护
superspec uninstall         # 移除 superSpec 生成的所有文件
superspec --help            # 显示帮助
superspec --version         # 显示版本
```

## 目录结构

```
.superspec/
├── config.yaml              # 项目配置
├── scripts/
│   └── validate.js          # 校验脚本（可独立运行）
├── specs/                   # 能力行为契约（活文档）
│   ├── spec-conventions.md
│   ├── init.md
│   ├── validate.md
│   ├── generate-spec.md
│   ├── update-spec.md
│   ├── generate-test.md
│   ├── archive.md
│   ├── brainstorm.md
│   ├── subagent-dev.md
│   ├── verify.md
│   ├── write-plan.md
│   ├── debug.md
│   └── skill-pipeline.md
├── changes/                 # 进行中的变更
│   └── <name>/
│       ├── delta.json       # Delta 变更描述
│       └── metadata.yaml    # 变更元数据
├── archive/                 # 已完成的变更
│   └── <name>/
│       ├── delta.json
│       ├── metadata.yaml
│       └── merged-spec.md   # 合并后的快照
└── templates/
    └── spec-template.md     # spec 模板

.claude/
├── skills/
│   ├── brainstorm/SKILL.md
│   ├── generate-spec/SKILL.md
│   ├── validate-spec/SKILL.md
│   ├── update-spec/SKILL.md
│   ├── generate-test/SKILL.md
│   ├── write-plan/SKILL.md
│   ├── tdd/SKILL.md
│   ├── subagent-dev/SKILL.md
│   ├── debug/SKILL.md
│   ├── verify/SKILL.md
│   └── archive/SKILL.md
└── hooks/
    ├── hooks.json
    └── session-start
```

## 技术栈

- **TypeScript** — 类型安全
- **Zod** — Schema 校验
- **Vitest** — 测试框架
- **Commander.js** — CLI 框架
- **Mermaid** — 图表生成
- **YAML** — 配置格式

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 运行测试
npm run test           # 383 个测试

# 开发模式
npm run dev            # tsc --watch

# 打包校验脚本
npm run bundle-validate
```

### 测试覆盖

- 30 个测试文件
- 383 个测试用例
- 覆盖：schema、parser、validator、rules、diagrams、config、delta-spec、change-workflow、pipeline、upstream、xml-tags、anti-rationalization

## 版本历史

| 版本 | 主题 | 关键功能 |
|------|------|---------|
| v1 | 基础框架 | init、validate、generate |
| v2 | Delta 系统 | 增量更新、语言适配器、CI 集成 |
| v3 | 行为层 | 7 个方法论技能、归档系统 |
| v4 | 规则引擎 | 9 条内置规则、Mermaid 图表系统 |
| v5 | 9 个优化方向 | XML 标签、反合理化、配置分层、delta-spec、变更工作流、管道、上游对齐、CI/CD、图表嵌入 |
| v6 | 能力体系 | 13 个能力行为契约 spec |
| v7 | 闭环 + 修复 | Markdown delta 合并、规则引擎否定语境修复、技能红线升级 |

## License

MIT
