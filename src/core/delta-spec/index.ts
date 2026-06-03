/**
 * Delta Spec 模块
 *
 * 提供增量变更描述、校验、冲突检测和合并能力。
 */

export type {
  DeltaOperationType,
  BaseDeltaOperation,
  AddedOperation,
  ModifiedOperation,
  RemovedOperation,
  RenamedOperation,
  DeltaOperation,
  DeltaSpec,
  Conflict,
  MergeResult,
} from './types.js';

export { validateDeltaFormat, validateDeltaSemantics } from './validator.js';
export type { ValidationResult } from './validator.js';

export { detectConflicts } from './conflict-detector.js';

export { applyDelta } from './merger.js';
