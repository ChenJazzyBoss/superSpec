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
│       └── spec.md          # spec 文件
└── templates/
    └── spec-template.md     # spec 模板

.claude/
├── skills/
│   ├── superspec:generate-spec/
│   │   └── SKILL.md         # 生成 spec 的技能
│   └── superspec:validate-spec/
│       └── SKILL.md         # 校验 spec 的技能
└── hooks/
    ├── hooks.json           # Hook 配置
    └── session-start        # 会话启动脚本
```

## CLI 命令

```bash
superspec init          # 初始化项目骨架
superspec validate <n>  # 校验 spec 文件
superspec --help        # 显示帮助
superspec --version     # 显示版本
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
