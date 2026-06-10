/**
 * 技能协作管道 - SkillGuard 运行时集成
 * @module pipeline/guard-runner
 *
 * 将 PipelineExecutor 和 SkillGuard 组合为统一的运行时。
 * 在管道的每个阶段执行时调用 SkillGuard 的钩子：
 * - beforeExecute: 检查技能文件的红线表和 HARD-GATE
 * - onOutput: 检测阶段输出中的跳步模式和红线匹配
 * - onCompletion: 验证阶段完成声明的证据
 * - onSubagentDelegation: 检查 SUBAGENT-STOP 标签
 */

import { PipelineExecutor, type StageHandler } from './executor.js';
import type { StageId, PipelineExecution } from './types.js';
import type { PipelineContextManager } from './context.js';
import { SkillGuard } from '../anti-rationalization/skill-guard.js';

/**
 * PipelineGuardRunner
 *
 * 将 SkillGuard 的四个钩子集成到 PipelineExecutor 的阶段执行流程中，
 * 实现运行时的反幻觉检查。
 */
export class PipelineGuardRunner {
  private executor: PipelineExecutor;
  private skillContents: Record<StageId, string>;
  private guardResults: Map<StageId, { redFlag?: string; patterns: string[] }>;

  constructor(skillContents: Record<StageId, string>) {
    this.executor = new PipelineExecutor();
    this.skillContents = skillContents;
    this.guardResults = new Map();
  }

  /**
   * 注册阶段执行函数
   * @param stageId - 阶段 id
   * @param handler - 阶段执行函数
   */
  registerHandler(stageId: StageId, handler: StageHandler): void {
    // 包装 handler，注入 SkillGuard 检查
    const wrappedHandler: StageHandler = async (context) => {
      // 1. beforeExecute: 检查技能文件的红线表和 HARD-GATE
      const skillContent = this.skillContents[stageId];
      const guard = new SkillGuard(skillContent);
      const beforeResult = guard.beforeExecute();

      if (!beforeResult.allowed) {
        throw new Error(`SkillGuard 阻断: ${beforeResult.issues.join('; ')}`);
      }

      // 2. 执行阶段 handler
      const result = await handler(context);

      // 3. onOutput: 检测跳步模式（基于阶段 handler 的输出）
      const output = JSON.stringify(result.toJSON());
      const outputResult = guard.onOutput(output);
      this.guardResults.set(stageId, {
        redFlag: outputResult.redFlag?.excuse,
        patterns: outputResult.patterns,
      });

      return result;
    };

    this.executor.registerHandler(stageId, wrappedHandler);
  }

  /**
   * 执行管道
   *
   * @param context - 管道上下文管理器
   * @param options - 执行选项
   * @param options.fromStage - 从指定阶段开始执行
   * @returns 管道执行记录
   */
  async execute(
    context: PipelineContextManager,
    options?: { fromStage?: StageId },
  ): Promise<PipelineExecution> {
    return this.executor.execute(context, options);
  }

  /**
   * 获取指定阶段的 SkillGuard 检测结果
   * @param stageId - 阶段 id
   * @returns 检测结果（红线匹配和跳步模式）
   */
  getGuardResult(stageId: StageId): { redFlag?: string; patterns: string[] } | undefined {
    return this.guardResults.get(stageId);
  }
}
