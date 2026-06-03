/**
 * 技能协作管道 - 前置条件和后置条件检查
 * @module pipeline/conditions
 */

import type { StageId, PipelineContext } from './types.js';

/** 条件检查结果 */
export interface ConditionResult {
  /** 条件是否满足 */
  satisfied: boolean;
  /** 不满足时的原因说明 */
  reason?: string;
}

/**
 * 检查阶段的前置条件
 *
 * 前置条件包括：输入文件存在、上游阶段已完成等。
 * 不满足时返回原因说明，调用方应阻断执行。
 *
 * @param stageId - 待执行的阶段 id
 * @param context - 当前管道上下文
 * @returns 条件检查结果
 */
export function checkPreconditions(stageId: StageId, context: PipelineContext): ConditionResult {
  switch (stageId) {
    case 'brainstorm':
      // brainstorm 无前置条件
      return { satisfied: true };

    case 'generate-spec':
      // 需要有 brainstorm 输出的需求内容（通过 metadata 传递）
      if (context.metadata['brainstormOutput'] === undefined) {
        return { satisfied: false, reason: '缺少需求收集输出，请先运行 brainstorm 阶段' };
      }
      return { satisfied: true };

    case 'validate-spec':
      // 需要 spec 文件路径已存在
      if (!context.specPath) {
        return { satisfied: false, reason: 'spec 文件路径不存在，请先运行 generate-spec 阶段' };
      }
      return { satisfied: true };

    case 'write-plan':
      // 需要 spec 存在且已通过校验
      if (!context.specPath) {
        return { satisfied: false, reason: 'spec 文件不存在，请先运行 generate-spec 和 validate-spec' };
      }
      if (!context.validationReport?.valid) {
        return { satisfied: false, reason: 'spec 未通过校验，请先运行 validate-spec 并确保校验通过' };
      }
      return { satisfied: true };

    case 'implement':
      // 需要实现计划存在
      if (!context.planPath) {
        return { satisfied: false, reason: '实现计划不存在，请先运行 write-plan 阶段' };
      }
      return { satisfied: true };

    case 'verify':
      // 需要实现已完成（通过 metadata 标记）
      if (!context.metadata['implementCompleted']) {
        return { satisfied: false, reason: '实现尚未完成，请先运行 implement 阶段' };
      }
      return { satisfied: true };

    case 'archive':
      // 需要验证已通过
      if (!context.metadata['verifyPassed']) {
        return { satisfied: false, reason: '验证未通过，请先运行 verify 阶段并确保所有测试通过' };
      }
      return { satisfied: true };

    case 'debug':
      // debug 阶段始终允许执行（由外部决定是否需要）
      return { satisfied: true };

    case 'generate-test':
      // 需要 spec 存在
      if (!context.specPath) {
        return { satisfied: false, reason: 'spec 文件路径不存在，请先运行 generate-spec 阶段' };
      }
      return { satisfied: true };

    default:
      return { satisfied: false, reason: `未知阶段: ${stageId}` };
  }
}

/**
 * 检查阶段的后置条件
 *
 * 后置条件包括：输出文件已生成、校验已通过等。
 * 不满足时返回原因说明，调用方应阻断后续阶段。
 *
 * @param stageId - 已完成的阶段 id
 * @param context - 当前管道上下文
 * @returns 条件检查结果
 */
export function checkPostconditions(stageId: StageId, context: PipelineContext): ConditionResult {
  switch (stageId) {
    case 'brainstorm':
      // brainstorm 完成后应有输出
      if (!context.metadata['brainstormOutput']) {
        return { satisfied: false, reason: '需求收集未产生输出' };
      }
      return { satisfied: true };

    case 'generate-spec':
      // 应生成 spec 文件路径
      if (!context.specPath) {
        return { satisfied: false, reason: 'generate-spec 未生成 spec 文件路径' };
      }
      return { satisfied: true };

    case 'validate-spec':
      // 应有校验报告
      if (!context.validationReport) {
        return { satisfied: false, reason: 'validate-spec 未生成校验报告' };
      }
      if (!context.validationReport.valid) {
        return { satisfied: false, reason: 'spec 校验未通过，请修正后重新校验' };
      }
      return { satisfied: true };

    case 'write-plan':
      // 应生成计划路径
      if (!context.planPath) {
        return { satisfied: false, reason: 'write-plan 未生成实现计划路径' };
      }
      return { satisfied: true };

    case 'implement':
      // 实现完成后应标记完成
      if (!context.metadata['implementCompleted']) {
        return { satisfied: false, reason: 'implement 阶段未标记完成' };
      }
      return { satisfied: true };

    case 'verify':
      // 验证完成后应标记通过
      if (!context.metadata['verifyPassed']) {
        return { satisfied: false, reason: '验证未通过，存在失败的测试用例' };
      }
      return { satisfied: true };

    case 'archive':
      // 归档完成后应标记归档路径
      if (!context.metadata['archivePath']) {
        return { satisfied: false, reason: 'archive 阶段未生成归档路径' };
      }
      return { satisfied: true };

    case 'debug':
    case 'generate-test':
      // 这些阶段无强制后置条件
      return { satisfied: true };

    default:
      return { satisfied: false, reason: `未知阶段: ${stageId}` };
  }
}
