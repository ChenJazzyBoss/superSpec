/**
 * 检查清单强制执行引擎
 *
 * 确保检查清单条目按顺序完成，阻止跳步行为，
 * 并要求每个完成声明附带非空证据。
 */

import type { ChecklistItem, BlockResult, ProgressInfo } from './types.js';

/**
 * 检查清单强制执行引擎
 *
 * 规则：
 * - 必须按顺序完成（从第一个 todo 条目开始）
 * - 跳步被阻止并记录
 * - evidence 不能为空
 * - 全部完成才能 proceed
 */
export class ChecklistEngine {
  private items: ChecklistItem[];
  private skipAttempts: Array<{ from: number; to: number; timestamp: string }> = [];

  /**
   * @param items - 检查清单条目列表
   */
  constructor(items: ChecklistItem[]) {
    // 深拷贝，避免外部修改影响内部状态
    this.items = items.map((item) => ({ ...item }));
  }

  /**
   * 获取当前待完成的条目
   *
   * @returns 当前第一个 status 为 'todo' 的条目，全部完成时返回 null
   */
  currentItem(): ChecklistItem | null {
    const firstTodo = this.items.find((item) => item.status === 'todo');
    return firstTodo ?? null;
  }

  /**
   * 标记指定条目为完成
   *
   * @param index - 条目的 id（从 1 开始）
   * @param evidence - 完成证据，不能为空
   * @throws evidence 为空时抛出错误
   * @throws index 无效时抛出错误
   */
  markComplete(index: number, evidence: string): void {
    if (!evidence || evidence.trim().length === 0) {
      throw new Error('证据不能为空：完成声明必须附带验证证据');
    }

    const item = this.items.find((i) => i.id === index);
    if (!item) {
      throw new Error(`条目 ${index} 不存在`);
    }

    if (item.status === 'done') {
      return; // 已完成，幂等操作
    }

    // 检查前置条目是否全部完成
    const preceding = this.items.filter((i) => i.id < index && i.status === 'todo');
    if (preceding.length > 0) {
      throw new Error(
        `无法完成条目 ${index}：前置条目 ${preceding.map((i) => i.id).join(', ')} 尚未完成`
      );
    }

    item.status = 'done';
    item.evidence = evidence;
  }

  /**
   * 检查是否可以继续下一步（全部条目已完成）
   *
   * @returns 全部完成时返回 true，否则返回 false
   */
  canProceed(): boolean {
    return this.items.every((item) => item.status === 'done');
  }

  /**
   * 尝试跳步到指定条目时的阻止检查
   *
   * @param targetIndex - 目标条目 id
   * @returns 阻止结果，包含是否被阻止及原因
   */
  blockSkip(targetIndex: number): BlockResult {
    const target = this.items.find((i) => i.id === targetIndex);
    if (!target) {
      return { blocked: true, reason: `条目 ${targetIndex} 不存在` };
    }

    if (target.status === 'done') {
      return { blocked: false }; // 已完成的条目可以重新访问
    }

    const preceding = this.items.filter((i) => i.id < targetIndex && i.status === 'todo');
    if (preceding.length > 0) {
      // 记录跳步尝试
      const current = this.currentItem();
      this.skipAttempts.push({
        from: current?.id ?? 0,
        to: targetIndex,
        timestamp: new Date().toISOString(),
      });

      return {
        blocked: true,
        reason: `禁止跳步：条目 ${preceding.map((i) => i.id).join(', ')} 尚未完成，无法执行条目 ${targetIndex}`,
      };
    }

    return { blocked: false };
  }

  /**
   * 获取当前进度信息
   *
   * @returns 进度对象，包含已完成数、总数和当前条目序号
   */
  getProgress(): ProgressInfo {
    const completed = this.items.filter((i) => i.status === 'done').length;
    const total = this.items.length;
    const current = this.currentItem()?.id ?? total;

    return { completed, total, current };
  }

  /**
   * 获取所有跳步尝试记录（用于调试和分析）
   *
   * @returns 跳步尝试记录的副本
   */
  getSkipAttempts(): ReadonlyArray<{ from: number; to: number; timestamp: string }> {
    return [...this.skipAttempts];
  }
}
