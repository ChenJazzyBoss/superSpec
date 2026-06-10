# Changelog

All notable changes to superSpec will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **多项目类型 Init Template** (`--template <type>`)
  - 4 种项目类型模板：general（通用）、web-api（Web API）、cli（命令行工具）、library（库/SDK）
  - `superspec init --template web-api` 指定模板类型
  - `superspec init --list-templates` 列出所有可用模板
  - 交互模式下增加项目类型选择步骤

- **技能协作管道** (`superspec pipeline`)
  - `superspec pipeline show` 显示 7 阶段 DAG 默认工作流
  - `superspec pipeline next <stage>` 查询推荐下一步

- **PipelineGuardRunner** — SkillGuard 运行时集成
  - 在管道阶段执行中注入 SkillGuard 钩子
  - beforeExecute 检查红线表和 HARD-GATE
  - onOutput 检测跳步模式和红线

- **技能路由建议系统**
  - 全部 11 个技能文件添加 `## 下一步` 路由建议
  - 基于 DEFAULT_WORKFLOW DAG 的结构化路由

### Fixed

- 修复 `build.js` 缺少 bundle-validate 步骤导致 E2E 测试失败的问题

## [1.0.0] - 2026-06-09

### Added

- **双层校验引擎** — Zod Schema（结构）+ 规则引擎（业务），确定性输出
- **SkillGuard 反幻觉系统** — 红线表、HARD-GATE、证据验证、完成检查清单
- **9 条内置校验规则** — 缺失 SHALL、模糊词汇、场景覆盖率、场景分类等
- **深度分析** — `--deep` 模式检测逻辑矛盾和覆盖缺口
- **自动图表** — `<!-- DIAGRAM:flowchart/state -->` 占位符自动生成 Mermaid 图表
- **源码追踪** — `<!-- source: path -->` 链接 spec 与代码
- **场景分类** — 自动标记 normal/error/boundary，缺少 error 场景触发警告
- **Delta 增量变更** — ADDED/REMOVED/MODIFIED/RENAMED 四种操作，拓扑排序执行
- **模块清单校验** — `superspec validate-modules`，循环依赖检测
- **Init Template** — 结构化收集人类上下文，阻断式门禁
- **子代理编排** — 双重审查管道：implement → spec-check → code-review
- **测试代码生成** — TypeScript (vitest) 和 Python (pytest) 骨架生成
- **CI 集成** — `superspec ci` 批量校验 + GitHub Actions workflow
- **11 个精简技能** — brainstorm → generate-spec → validate-spec → write-plan → tdd/subagent-dev → verify → archive
- **配置分层** — Global → Project → Change，优先级合并
- **归档系统** — Full change lifecycle: draft → in-progress → review → done
