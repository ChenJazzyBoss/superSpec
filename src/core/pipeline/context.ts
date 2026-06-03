/**
 * 技能协作管道 - 上下文管理器
 * @module pipeline/context
 */

import type { PipelineContext } from './types.js';

/** 默认上下文值 */
const DEFAULT_CONTEXT: PipelineContext = {
  retryCount: 0,
  metadata: {},
};

/**
 * 管道上下文管理器
 *
 * 提供类型安全的上下文读写能力，在管道各阶段之间传递状态数据。
 */
export class PipelineContextManager {
  private context: PipelineContext;

  constructor(initial?: Partial<PipelineContext>) {
    this.context = { ...DEFAULT_CONTEXT, ...initial };
  }

  /**
   * 读取上下文字段
   * @param key - 字段名
   * @returns 字段值
   */
  get<K extends keyof PipelineContext>(key: K): PipelineContext[K] {
    return this.context[key];
  }

  /**
   * 写入上下文字段
   * @param key - 字段名
   * @param value - 字段值
   */
  set<K extends keyof PipelineContext>(key: K, value: PipelineContext[K]): void {
    this.context[key] = value;
  }

  /**
   * 检查上下文是否包含指定字段
   * @param key - 字段名
   * @returns 是否存在该字段（且不为 undefined）
   */
  has(key: keyof PipelineContext): boolean {
    return this.context[key] !== undefined;
  }

  /**
   * 导出上下文为纯对象
   * @returns 上下文数据的浅拷贝
   */
  toJSON(): PipelineContext {
    return { ...this.context };
  }

  /**
   * 从 JSON 字符串还原上下文管理器
   * @param data - JSON 字符串
   * @returns 新的 PipelineContextManager 实例
   */
  static fromJSON(data: string): PipelineContextManager {
    const parsed = JSON.parse(data) as Partial<PipelineContext>;
    return new PipelineContextManager(parsed);
  }
}
