/**
 * Delta Spec 增量变更类型定义
 *
 * 定义 Delta Spec 的核心数据结构，支持 ADDED、MODIFIED、REMOVED、RENAMED 四种操作类型。
 */

/** Delta 操作类型 */
export type DeltaOperationType = 'ADDED' | 'MODIFIED' | 'REMOVED' | 'RENAMED';

/** 基础 Delta 操作（公共字段） */
export interface BaseDeltaOperation {
  /** 操作类型 */
  operation: DeltaOperationType;
  /** 操作目标路径（如 "requirements.auth.login"） */
  path: string;
  /** 可选的变更元数据 */
  metadata?: {
    author?: string;
    timestamp?: string;
    reason?: string;
  };
}

/** ADDED 操作 — 向基准 Spec 中新增内容 */
export interface AddedOperation extends BaseDeltaOperation {
  operation: 'ADDED';
  /** 新增内容的完整描述 */
  content: string;
}

/** MODIFIED 操作 — 修改基准 Spec 中的现有内容 */
export interface ModifiedOperation extends BaseDeltaOperation {
  operation: 'MODIFIED';
  /** 修改前的内容快照 */
  before: string;
  /** 修改后的内容 */
  after: string;
}

/** REMOVED 操作 — 从基准 Spec 中删除内容 */
export interface RemovedOperation extends BaseDeltaOperation {
  operation: 'REMOVED';
  /** 被删除内容的快照（用于审计和回滚） */
  content: string;
}

/** RENAMED 操作 — 重命名基准 Spec 中的元素路径 */
export interface RenamedOperation extends BaseDeltaOperation {
  operation: 'RENAMED';
  /** 原始路径 */
  oldPath: string;
  /** 新路径 */
  newPath: string;
}

/** Delta 操作联合类型 */
export type DeltaOperation = AddedOperation | ModifiedOperation | RemovedOperation | RenamedOperation;

/** Delta Spec — 描述相对于基准 Spec 的增量变更 */
export interface DeltaSpec {
  /** 基准 Spec 引用（文件路径或标识符） */
  baseSpec: string;
  /** 变更操作列表 */
  operations: DeltaOperation[];
  /** 元数据 */
  metadata: {
    author: string;
    timestamp: string;
    description: string;
  };
}

/** 冲突描述 */
export interface Conflict {
  /** 严重程度：error 阻止合并，warning 允许继续但需注意 */
  severity: 'error' | 'warning';
  /** 冲突类型 */
  type: 'contradiction' | 'dependency' | 'path';
  /** 冲突所在路径 */
  path: string;
  /** 冲突详细说明 */
  detail: string;
  /** 解决建议 */
  suggestion?: string;
}

/** 合并结果 */
export interface MergeResult {
  /** 合并是否成功 */
  success: boolean;
  /** 合并后的 Spec 内容（仅成功时有值） */
  result?: string;
  /** 合并冲突列表（仅失败时有值） */
  conflicts?: Conflict[];
  /** 合并过程操作日志 */
  log: string[];
}
