/**
 * 技能协作管道 - 核心类型定义
 * @module pipeline/types
 */

/** 管道阶段标识符 */
export type StageId =
  | 'brainstorm'
  | 'generate-spec'
  | 'validate-spec'
  | 'write-plan'
  | 'implement'
  | 'verify'
  | 'archive'
  | 'debug'
  | 'generate-test';

/** 阶段执行状态 */
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/** 阶段定义 */
export interface StageDefinition {
  /** 阶段唯一标识 */
  id: StageId;
  /** 阶段显示名称 */
  name: string;
  /** 是否为必需阶段（不可跳过） */
  required: boolean;
  /** 依赖的上游阶段列表 */
  dependencies: StageId[];
}

/** 管道上下文 - 在阶段间传递的状态数据 */
export interface PipelineContext {
  /** spec 文件路径 */
  specPath?: string;
  /** spec 名称 */
  specName?: string;
  /** 校验报告 */
  validationReport?: { valid: boolean; issues: unknown[] };
  /** 实现计划路径 */
  planPath?: string;
  /** 错误信息 */
  error?: string;
  /** 当前重试次数 */
  retryCount: number;
  /** 扩展元数据 */
  metadata: Record<string, unknown>;
}

/** 单个阶段的执行结果 */
export interface StageResult {
  /** 执行状态 */
  status: StageStatus;
  /** 阶段完成后的上下文快照 */
  context: PipelineContext;
  /** 执行耗时（毫秒） */
  duration: number;
  /** 错误信息（失败时） */
  error?: string;
}

/** 管道执行记录 */
export interface PipelineExecution {
  /** 执行唯一标识 */
  id: string;
  /** 各阶段执行结果 */
  stages: Map<StageId, StageResult>;
  /** 管道整体状态 */
  status: 'running' | 'completed' | 'failed';
  /** 开始时间（ISO 8601） */
  startedAt: string;
  /** 结束时间（ISO 8601） */
  completedAt?: string;
}
