# superSpec 项目指南

## 项目概述

superSpec 是一个 AI-Native 的规格说明书管理工具，用于 Claude Code 环境。

**核心价值**：
- 程序化校验 — Zod + 规则引擎，确定性输出
- 反幻觉系统 — SkillGuard 程序化检测，防止 AI 跳步
- 精简技能 — 11 个技能，总计 1193 行，AI 读得完、记得住
- CI 集成 — CLI + JSON 输出 + GitHub Actions

## 技术栈

- **语言**：TypeScript（strict mode）
- **运行时**：Node.js >= 20
- **构建工具**：esbuild
- **测试框架**：vitest（383 个测试）
- **核心依赖**：zod, commander, js-yaml

## 项目结构

```
superSpec/
├── src/
│   ├── core/                    # 核心引擎
│   │   ├── spec-schema.ts       # Zod Schema 定义
│   │   ├── spec-parser.ts       # Markdown → Spec 解析器
│   │   ├── validator.ts         # 双层校验引擎
│   │   ├── config.ts            # 校验常量
│   │   ├── rules/               # 规则引擎
│   │   ├── anti-rationalization/# 反幻觉系统
│   │   ├── xml-tags/            # XML 标签系统
│   │   ├── delta-spec/          # Delta 增量变更
│   │   ├── pipeline/            # 管道系统
│   │   └── diagrams/            # 图表生成
│   ├── skills/                  # Claude Code 技能（11 个）
│   ├── adapters/                # 测试代码生成适配器
│   ├── cli/                     # CLI 入口
│   └── ci/                      # CI 集成
├── templates/                   # 模板文件
├── test/                        # 测试文件
└── bin/                         # CLI 可执行文件
```

## 核心概念

### 1. 双层校验引擎

- **第一层**：Zod Schema 结构校验（parse 阶段）
- **第二层**：规则引擎业务校验（10 条内置规则）

### 2. SkillGuard 反幻觉系统

- `beforeExecute()` — 检查红线表和 HARD-GATE
- `onOutput()` — 检测跳步模式和红线
- `onCompletion()` — 验证完成声明的证据
- `onSubagentDelegation()` — 检查 SUBAGENT-STOP 标签

### 3. XML 标签系统

- `<HARD-GATE>` — 不可绕过的执行门禁
- `<CHECKLIST>` — 检查清单
- `<EXTREMELY-IMPORTANT>` — 极端重要性声明
- `<SUBAGENT-STOP>` — 子代理停止标记

### 4. Delta 增量变更

- 支持 ADDED/REMOVED/MODIFIED/RENAMED 操作
- 拓扑排序执行，自动校验合并结果

## 开发规范

### 代码风格

- 使用 TypeScript strict mode
- 函数和变量使用 camelCase
- 类型和接口使用 PascalCase
- 常量使用 UPPER_SNAKE_CASE

### 测试要求

- 每个新功能必须有测试
- 测试文件放在 `test/` 目录下
- 运行测试：`npm test`
- 测试覆盖率要求：80%+

### 提交规范

- 使用中文提交信息
- 格式：`功能(<范围>): <描述>` 或 `修复(<范围>): <描述>`
- 每个功能一个分支，合并回 main

## 常用命令

```bash
# 构建项目
npm run build

# 运行测试
npm test

# 运行单个测试
npx vitest run test/path/to/test.ts

# 初始化 superSpec
npx superspec init

# 校验 spec
npx superspec validate <spec-name>

# 检查技能配置
npx superspec guard <skill-path>

# 批量校验
npx superspec ci

# 生成测试代码
npx superspec generate <spec-name> -l typescript
```

## 设计原则

1. **确定性优先** — 程序做确定性检查，AI 做判断性检查
2. **精简技能** — 技能文件要精简，参考材料放 references/
3. **证据驱动** — 完成声明必须附带证据
4. **防御性设计** — 多级门控，防止 AI 跳步
5. **可扩展性** — 核心不可改，外围可替换

## 简历亮点

### 可以深入讲解的点

1. **SkillGuard 反幻觉系统**
   - 问题：AI 会"合理化"跳过步骤
   - 方案：程序化检测红线表、HARD-GATE、证据验证
   - 效果：防止 AI 幻觉，确保流程完整性

2. **双层校验引擎**
   - 问题：单一校验不够全面
   - 方案：Zod Schema（结构）+ 规则引擎（业务）
   - 效果：确定性输出，相同输入永远相同输出

3. **Init Template 机制**
   - 问题：AI 无法获取人类大脑中的知识
   - 方案：结构化收集上下文，阻断式门禁
   - 效果：提升 AI 生成质量

4. **Delta 增量变更**
   - 问题：全量重跑效率低
   - 方案：拓扑排序 + 自动校验的增量合并
   - 效果：高效处理需求变更
