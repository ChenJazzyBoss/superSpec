/**
 * 技能协作管道 - 默认工作流定义
 * @module pipeline/workflow
 */

import type { StageDefinition, StageId } from './types.js';

/** 默认核心工作流：brainstorm → generate-spec → validate-spec → write-plan → implement → verify → archive */
export const DEFAULT_WORKFLOW: StageDefinition[] = [
  { id: 'brainstorm', name: '需求收集', required: false, dependencies: [] },
  { id: 'generate-spec', name: '生成 Spec', required: true, dependencies: ['brainstorm'] },
  { id: 'validate-spec', name: '校验 Spec', required: true, dependencies: ['generate-spec'] },
  { id: 'write-plan', name: '生成计划', required: true, dependencies: ['validate-spec'] },
  { id: 'implement', name: '实施', required: true, dependencies: ['write-plan'] },
  { id: 'verify', name: '验证', required: true, dependencies: ['implement'] },
  { id: 'archive', name: '归档', required: true, dependencies: ['verify'] },
];

/** 获取默认工作流的所有阶段定义 */
export function getWorkflowStages(): StageDefinition[] {
  return [...DEFAULT_WORKFLOW];
}

/** 按 id 查找阶段定义 */
export function getStage(id: StageId): StageDefinition | undefined {
  return DEFAULT_WORKFLOW.find((s) => s.id === id);
}

/**
 * 获取从指定阶段开始（含）到工作流结束的所有阶段
 * @param fromId - 起始阶段 id
 * @returns 从起始阶段到末尾的阶段列表
 */
export function getStagesFrom(fromId: StageId): StageDefinition[] {
  const idx = DEFAULT_WORKFLOW.findIndex((s) => s.id === fromId);
  if (idx === -1) {
    return [];
  }
  return DEFAULT_WORKFLOW.slice(idx);
}
