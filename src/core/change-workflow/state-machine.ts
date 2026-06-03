/**
 * 变更状态机
 *
 * 定义变更状态的合法流转路径，提供状态跳转校验和查询能力。
 */

import type { ChangeState } from './types.js';

/** 各状态允许跳转到的目标状态列表 */
const VALID_TRANSITIONS: Record<ChangeState, ChangeState[]> = {
  'draft': ['in-progress'],
  'in-progress': ['review', 'draft'],
  'review': ['done', 'in-progress'],
  'done': ['archived'],
  'archived': [],
};

/**
 * 判断从一个状态到目标状态是否合法
 *
 * @param from - 当前状态
 * @param to - 目标状态
 * @returns 是否允许跳转
 */
export function canTransition(from: ChangeState, to: ChangeState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * 获取当前状态所有合法的下一步状态
 *
 * @param state - 当前状态
 * @returns 可跳转的状态列表
 */
export function getValidTransitions(state: ChangeState): ChangeState[] {
  return [...(VALID_TRANSITIONS[state] ?? [])];
}
