/**
 * 技能协作管道 - 执行引擎
 * @module pipeline/executor
 */

import type { StageDefinition, StageId, StageResult, PipelineExecution, StageStatus } from './types.js';
import { DEFAULT_WORKFLOW } from './workflow.js';
import { PipelineContextManager } from './context.js';
import { checkPreconditions, checkPostconditions } from './conditions.js';

/** 生成唯一执行 id */
function generateExecutionId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 阶段执行函数类型 */
export type StageHandler = (context: PipelineContextManager) => Promise<PipelineContextManager>;

/**
 * 管道执行引擎
 *
 * 负责按工作流定义顺序执行各阶段，管理阶段间的状态传递，
 * 检查前置/后置条件，处理可选阶段的跳过逻辑。
 */
export class PipelineExecutor {
  private workflow: StageDefinition[];
  private handlers: Map<StageId, StageHandler>;

  constructor(workflow?: StageDefinition[]) {
    this.workflow = workflow ?? DEFAULT_WORKFLOW;
    this.handlers = new Map();
  }

  /**
   * 注册阶段执行函数
   * @param stageId - 阶段 id
   * @param handler - 阶段执行函数
   */
  registerHandler(stageId: StageId, handler: StageHandler): void {
    this.handlers.set(stageId, handler);
  }

  /**
   * 执行管道
   *
   * @param context - 管道上下文管理器
   * @param options - 执行选项
   * @param options.fromStage - 从指定阶段开始执行（跳过之前的阶段）
   * @returns 管道执行记录
   */
  async execute(
    context: PipelineContextManager,
    options?: { fromStage?: StageId },
  ): Promise<PipelineExecution> {
    const execution: PipelineExecution = {
      id: generateExecutionId(),
      stages: new Map(),
      status: 'running',
      startedAt: new Date().toISOString(),
    };

    // 确定要执行的阶段列表
    let stagesToRun = this.workflow;
    if (options?.fromStage) {
      const idx = this.workflow.findIndex((s) => s.id === options.fromStage);
      if (idx === -1) {
        throw new Error(`未知的起始阶段: ${options.fromStage}`);
      }
      // 将跳过的阶段标记为 skipped
      for (let i = 0; i < idx; i++) {
        const skippedStage = this.workflow[i];
        execution.stages.set(skippedStage.id, {
          status: 'skipped',
          context: context.toJSON(),
          duration: 0,
        });
      }
      stagesToRun = this.workflow.slice(idx);
    }

    for (const stage of stagesToRun) {
      const startTime = Date.now();

      // 可选阶段无 handler 时自动跳过
      if (!stage.required && !this.handlers.has(stage.id)) {
        execution.stages.set(stage.id, {
          status: 'skipped',
          context: context.toJSON(),
          duration: 0,
        });
        continue;
      }

      // 检查前置条件
      const preResult = checkPreconditions(stage.id, context.toJSON());
      if (!preResult.satisfied) {
        const result: StageResult = {
          status: 'failed',
          context: context.toJSON(),
          duration: Date.now() - startTime,
          error: `前置条件不满足: ${preResult.reason}`,
        };
        execution.stages.set(stage.id, result);
        context.set('error', result.error);
        execution.status = 'failed';
        execution.completedAt = new Date().toISOString();
        return execution;
      }

      // 执行阶段
      try {
        const handler = this.handlers.get(stage.id);
        if (handler) {
          context = await handler(context);
        }

        // 检查后置条件
        const postResult = checkPostconditions(stage.id, context.toJSON());
        const status: StageStatus = postResult.satisfied ? 'completed' : 'failed';
        const duration = Date.now() - startTime;

        execution.stages.set(stage.id, {
          status,
          context: context.toJSON(),
          duration,
          error: postResult.satisfied ? undefined : `后置条件不满足: ${postResult.reason}`,
        });

        if (!postResult.satisfied) {
          context.set('error', `后置条件不满足: ${postResult.reason}`);
          execution.status = 'failed';
          execution.completedAt = new Date().toISOString();
          return execution;
        }
      } catch (err) {
        const duration = Date.now() - startTime;
        const errorMsg = err instanceof Error ? err.message : String(err);
        execution.stages.set(stage.id, {
          status: 'failed',
          context: context.toJSON(),
          duration,
          error: errorMsg,
        });
        context.set('error', errorMsg);
        execution.status = 'failed';
        execution.completedAt = new Date().toISOString();
        return execution;
      }
    }

    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();
    return execution;
  }
}
