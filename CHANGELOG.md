# Changelog

All notable changes to superSpec will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Delta Spec Header 解析**（Issue #8）— 校验器现在接受 delta spec 的标题前缀
  - 支持 `## ADDED Requirements`、`## MODIFIED Requirements`、`## REMOVED Requirements`、`## RENAMED Requirements`
  - 支持 `## ADDED Purpose` 等其他 section 的 delta 前缀
  - 向后兼容：无前缀的 `## Requirements` 仍然有效

- **CLAUDE.md 处理反馈**（Issue #7）— `superspec init` 现在明确告知 CLAUDE.md 的处理状态
  - 🆕 创建新文件 / 🔄 更新已有哨兵内容 / 📎 追加到已有文件

### Added

- **change create 自动创建 init.md**（Issue #9）— 变更目录创建时自动生成背景情报模板
  - `superspec change create <name>` 自动创建 `init.md` 引导用户填写上下文
  - CLI 输出增加分步引导：填写 init.md → 生成 spec → 编辑 proposal

### Added

- **Pipeline Run 命令** — 让管道引擎真正可执行
  - `superspec pipeline run <name>` 从 validate-spec 开始自动执行可程序化阶段
  - `superspec pipeline run <name> --from <stage>` 从指定阶段恢复执行
  - `superspec pipeline status [name]` 查看管道执行状态
  - `superspec pipeline list` 列出所有执行记录
  - `superspec pipeline resume <exec-id>` 恢复中断的管道执行
  - 可程序化阶段（validate-spec、archive）自动执行，无需人工干预
  - AI 阶段（brainstorm、generate-spec 等）输出操作指引，等待完成后恢复
  - 执行记录持久化到 `.superspec/pipeline/<exec-id>.json`

- **统一变更管道与多路径路由** — 借鉴 OpenSpec
  - 变更目录生命周期管理：proposal → delta-spec → apply → archive
  - Markdown Delta Spec 解析器（ADDED/MODIFIED/REMOVED/RENAMED）
  - Specs Apply 合并引擎，支持 dry-run 模式
  - CLI 子命令：`superspec change create/status/apply/list`
  - brainstorm 技能重构为中央路由器（新功能走统一路径，Bug 走排障路径）
  - generate-spec/update-spec 引导向 change 目录（不直接修改主 spec）

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
