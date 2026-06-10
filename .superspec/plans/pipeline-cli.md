# Pipeline CLI 与 SkillGuard 运行时集成 实现计划

> 生成时间：2026-06-10
> 来源 spec：.superspec/specs/pipeline-cli/spec.md

## 文件结构

| 文件 | 职责 |
|------|------|
| src/core/pipeline/guard-runner.ts | PipelineGuardRunner：组合 PipelineExecutor + SkillGuard |
| src/cli/pipeline-commands.ts | pipeline show / pipeline next CLI 子命令 |
| test/core/pipeline/guard-runner.test.ts | PipelineGuardRunner 单元测试 |
| test/e2e/pipeline-cli.test.ts | pipeline CLI 命令 E2E 测试 |

## 任务列表

### 任务 1：实现 PipelineGuardRunner

**文件**：src/core/pipeline/guard-runner.ts

**步骤**：

1. 编写失败测试
2. 运行测试，确认失败
3. 编写实现
4. 运行测试，确认通过
5. 提交

### 任务 2：实现 Pipeline CLI 子命令

**文件**：src/cli/pipeline-commands.ts + 修改 src/cli/index.ts

**步骤**：

1. 编写失败测试
2. 运行测试，确认失败
3. 编写实现
4. 运行测试，确认通过
5. 提交

### 任务 3：集成到 CLI 入口并验证

**文件**：src/cli/index.ts

**步骤**：

1. 修改 CLI 入口注册 pipeline 子命令
2. 运行 E2E 测试
3. 运行全量测试确认无回归
4. 提交
