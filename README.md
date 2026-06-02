# superSpec

AI 原生的 spec 管理工具，专为 Claude Code 设计。

## 什么是 spec？

spec（规格说明书）是功能的结构化定义，包含：
- **Purpose**：功能的目的和价值（至少 50 字）
- **Requirements**：具体需求，使用 SHALL/MUST 关键词
- **Scenarios**：每个需求的验收场景（Given/When/Then）

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
- `.superspec/` — 配置、模板、校验脚本
- `.claude/` — Skills 和 Hooks 配置
- `CLAUDE.md` — Claude Code 上下文

### 生成 spec

在 Claude Code 中使用技能：

```
/superspec:generate-spec
```

或手动创建 spec 文件：

```bash
cp .superspec/templates/spec-template.md .superspec/specs/my-feature/spec.md
# 编辑 spec.md
```

### 校验 spec

```bash
node .superspec/scripts/validate.js .superspec/specs/my-feature/spec.md
```

严格模式（WARNING 也导致失败）：

```bash
node .superspec/scripts/validate.js .superspec/specs/my-feature/spec.md --strict
```

## spec 文件格式

```markdown
# 功能名称

## Purpose

功能的目的和价值描述（至少 50 个字符）。

## Requirements

### Requirement: 需求名称
需求描述，必须包含 SHALL 或 MUST 关键词。

#### Scenario: 场景名称
Given 前置条件
When 触发动作
Then 预期结果

#### Scenario: 异常场景
Given 前置条件
When 异常情况
Then 错误处理
```

### 校验规则

| 规则 | 级别 | 说明 |
|------|------|------|
| Purpose ≥ 50 字 | ERROR | 概述内容至少 50 个字符 |
| 包含 SHALL/MUST | ERROR | 需求文本必须包含强制性关键词 |
| 场景数 ≥ 2 | ERROR | 每个需求至少 2 个验收场景 |
| 场景数 ≥ 3 | WARNING | 推荐 3 个场景以提高验证覆盖率 |

## 目录结构

```
.superspec/
├── config.yaml              # 项目配置
├── scripts/
│   └── validate.js          # 校验脚本（可独立运行）
├── specs/
│   └── <spec-name>/
│       ├── spec.md          # spec 文件
│       └── history/         # 快照历史
│           └── *.md
└── templates/
    └── spec-template.md     # spec 模板

.claude/
├── skills/
│   ├── superspec:generate-spec/
│   │   └── SKILL.md         # 生成 spec 的技能
│   ├── superspec:validate-spec/
│   │   └── SKILL.md         # 校验 spec 的技能
│   ├── superspec:update-spec/
│   │   └── SKILL.md         # 增量更新 spec 的技能
│   └── superspec:generate-test/
│       └── SKILL.md         # 生成测试代码的技能
└── hooks/
    ├── hooks.json           # Hook 配置
    └── session-start        # 会话启动脚本
```

## CLI 命令

```bash
superspec init              # 初始化项目骨架
superspec init --interactive # 交互式配置
superspec init --ci         # 初始化并生成 CI workflow
superspec validate <name>   # 校验 spec 文件
superspec update <name>     # 增量更新 spec（Delta Merge）
superspec generate <name>   # 生成测试代码骨架
superspec ci                # 批量校验所有 spec
superspec diff <name>       # 对比当前与历史版本
superspec history <name>    # 查看历史快照列表
superspec uninstall         # 移除 superSpec 生成的所有文件
superspec --help            # 显示帮助
superspec --version         # 显示版本
```

## v2 功能

### Delta Merge — 增量更新

使用结构化的 Delta JSON 描述 spec 的增量变更，无需每次重写整个文件。

```bash
# 从文件更新
superspec update batch-export --file delta.json

# 从 stdin 更新
echo '{"specName":"batch-export","changes":[...]}' | superspec update batch-export
```

Delta 格式示例：

```json
{
  "specName": "batch-export",
  "changes": [
    { "type": "ADDED", "section": "requirement", "target": "PDF 导出", "content": "系统 SHALL 支持 PDF 格式导出。" },
    { "type": "MODIFIED", "section": "requirement", "target": "导出格式支持", "field": "text", "newValue": "系统 SHALL 支持 CSV、XLSX 和 PDF 格式。" },
    { "type": "REMOVED", "section": "scenario", "target": "CSV 导出", "parent": "导出格式支持" },
    { "type": "RENAMED", "section": "requirement", "target": "旧名称", "newValue": "新名称" }
  ]
}
```

变更类型：`ADDED` / `REMOVED` / `MODIFIED` / `RENAMED`
变更位置：`overview` / `requirement` / `scenario`

### Adapter — 测试代码生成

根据 spec 自动生成测试代码骨架。

```bash
# 生成 TypeScript (vitest) 测试
superspec generate batch-export --lang typescript

# 生成 Python (pytest) 测试
superspec generate batch-export --lang python

# 写入文件
superspec generate batch-export --lang typescript --output test/batch-export.test.ts
```

支持的语言：
- **typescript** — vitest 测试骨架（describe/it/expect）
- **python** — pytest 测试骨架（class/test_）

### CI 集成

批量校验所有 spec，适合在 CI 流程中使用。

```bash
# 校验所有 spec
superspec ci

# 严格模式（WARNING 也视为失败）
superspec ci --strict

# JSON 输出
superspec ci --json
```

初始化时生成 GitHub Actions workflow：

```bash
superspec init --ci
```

### 版本追踪

自动在校验通过时保存快照，支持历史对比。

```bash
# 查看历史版本
superspec history batch-export

# 对比当前与最近快照
superspec diff batch-export

# 对比指定版本
superspec diff batch-export --from 2026-06-02T10-30-00
```

### 卸载

```bash
superspec uninstall       # 交互确认
superspec uninstall -y    # 跳过确认
```

## 开发

```bash
npm install
npm run build           # 构建项目
npm run test            # 运行测试
npm run dev             # 开发模式（tsc --watch）
npm run bundle-validate # 打包校验脚本
```

## License

MIT
