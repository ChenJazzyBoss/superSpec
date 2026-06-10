# 统一变更管道与多路径路由 实现计划

> 生成时间：2026-06-10
> 来源 spec：.superspec/specs/unified-change-pipeline/spec.md

## 设计决策

### 借鉴来源

| 来源 | 借鉴内容 |
|------|---------|
| OpenSpec | 统一 change 目录、proposal.md、Markdown delta spec、apply 时合并 |
| cospowers | 中央路由器（brainstorm 根据意图分发到不同路径） |
| superSpec | 保持 delta JSON 用于程序校验、SkillGuard、双层校验 |

### 双格式 Delta 策略

- **Markdown delta spec**（change/specs/<name>/spec.md）：人可读、AI 可理解，统一格式
- **程序化 apply**：解析 Markdown delta → 执行合并 → 校验结果（借鉴 OpenSpec 的 specs-apply.ts）
- **向后兼容**：保留现有 JSON delta + update 命令，同时新增 Markdown delta 路径

### 路由决策

```
brainstorm（中央路由器）
  │
  ├─ 新功能/增量修改 → proposal → delta-spec → validate → write-plan → implement → verify → archive
  │                    统一变更路径（区别仅在 delta-spec 的 ADDED vs MODIFIED）
  │
  └─ 排障 → debug → verify → archive
            排障路径（跳过 proposal 和 spec 阶段）
```

## 文件结构

| 文件 | 职责 |
|------|------|
| src/core/change-lifecycle.ts | 变更目录管理：创建、查询、状态跟踪 |
| src/core/proposal.ts | Proposal 生成与解析 |
| src/core/delta-spec-parser.ts | Markdown delta spec 解析（ADDED/MODIFIED/REMOVED/RENAMED） |
| src/core/specs-apply.ts | Delta spec 合并到主 spec（apply），dry-run 支持 |
| src/core/pipeline/workflow.ts | 修改：增加路由决策阶段 |
| src/skills/brainstorm/SKILL.md | 修改：增加中央路由器逻辑 |
| src/cli/index.ts | 修改：增加 change create / change apply 命令 |
| templates/change/proposal.md | Proposal 模板 |
| templates/change/delta-spec.md | Delta spec 模板 |
| test/core/change-lifecycle.test.ts | 变更生命周期测试 |
| test/core/delta-spec-parser.test.ts | Delta spec 解析测试 |
| test/core/specs-apply.test.ts | Apply 合并测试 |

## 任务列表

### 任务 1：变更目录生命周期管理

**文件**：src/core/change-lifecycle.ts, templates/change/proposal.md

**步骤**：

1. 创建 proposal 模板 `templates/change/proposal.md`
2. 实现 `createChange(projectRoot, name, proposal)` 创建变更目录
3. 实现 `listChanges()` 增强，支持新文件结构
4. 实现 `getChangeStatus()` 查询变更阶段（proposal → spec → plan → implement → verify → archive）
5. 编写测试
6. 运行 `npm test` 确认无回归

### 任务 2：Markdown Delta Spec 解析器

**文件**：src/core/delta-spec-parser.ts, templates/change/delta-spec.md

**步骤**：

1. 创建 delta spec 模板
2. 实现 `parseDeltaSpec(markdown)` 解析 ADDED/MODIFIED/REMOVED/RENAMED 段落
3. 实现 `validateDeltaSpec(delta, mainSpec)` 校验 delta 引用的 requirement 是否存在
4. 编写测试
5. 运行 `npm test` 确认无回归

### 任务 3：Specs Apply 合并引擎

**文件**：src/core/specs-apply.ts

**步骤**：

1. 实现 `findSpecUpdates(changeDir, mainSpecsDir)` 查找待合并的 delta spec
2. 实现 `buildUpdatedSpec(deltaSpec, mainSpecContent)` 按序合并（RENAMED→REMOVED→MODIFIED→ADDED）
3. 实现 `dryRunApply(changeDir, mainSpecsDir)` 合并但不写入
4. 实现 `applySpecs(changeDir, mainSpecsDir)` 合并并写入
5. 编写测试
6. 运行 `npm test` 确认无回归

### 任务 4：CLI 命令增强

**文件**：src/cli/index.ts

**步骤**：

1. 增加 `superspec change create <name>` 创建变更目录 + proposal
2. 增加 `superspec change status <name>` 查询变更状态
3. 修改 `archive` 命令集成 specs-apply
4. 编写 E2E 测试
5. 运行 `npm test` 确认无回归

### 任务 5：中央路由器集成

**文件**：src/skills/brainstorm/SKILL.md

**步骤**：

1. 修改 brainstorm SKILL.md 增加路由决策步骤
2. 更新 generate-spec 技能指向 change 目录
3. 更新 update-spec 技能指向 change 目录
4. 运行全量测试
