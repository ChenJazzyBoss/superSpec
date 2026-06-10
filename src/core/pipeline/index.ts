/**
 * 技能协作管道 - 统一导出
 * @module pipeline
 */

export type {
  StageId,
  StageStatus,
  StageDefinition,
  PipelineContext,
  StageResult,
  PipelineExecution,
} from './types.js';

export {
  DEFAULT_WORKFLOW,
  getWorkflowStages,
  getStage,
  getStagesFrom,
} from './workflow.js';

export { PipelineContextManager } from './context.js';

export type { ConditionResult } from './conditions.js';
export { checkPreconditions, checkPostconditions } from './conditions.js';

export type { FailureType } from './retry.js';
export { classifyFailure, shouldRetry, getRetryDelay } from './retry.js';

export type { StageHandler } from './executor.js';
export { PipelineExecutor } from './executor.js';

export { PipelineGuardRunner } from './guard-runner.js';
