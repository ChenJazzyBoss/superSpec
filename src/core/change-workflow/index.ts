/**
 * 变更工作流模块
 *
 * 提供变更提案的创建、状态流转、任务管理和归档能力。
 */

export type { ChangeState, ChangeMetadata, TaskItem } from './types.js';
export { canTransition, getValidTransitions } from './state-machine.js';
export { ChangeManager } from './change-manager.js';
