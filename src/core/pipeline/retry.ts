/**
 * 技能协作管道 - 重试与失败分类策略
 * @module pipeline/retry
 */

import type { StageId } from './types.js';

/** 失败类型分类 */
export type FailureType = 'data' | 'logic' | 'transient';

/**
 * 对错误信息进行失败分类
 *
 * 分类规则：
 * - `data`: 数据格式错误（文件不存在、格式不正确、字段缺失等）
 * - `logic`: 逻辑错误（校验失败、需求矛盾等）
 * - `transient`: 临时性错误（超时、网络问题、资源竞争等）
 *
 * @param error - 错误信息
 * @returns 失败类型
 */
export function classifyFailure(error: string): FailureType {
  const lower = error.toLowerCase();

  // 临时性错误关键词
  const transientPatterns = ['timeout', '超时', 'network', '网络', 'econnrefused', 'econnreset', '暂时', 'temporary', 'retry', '重试'];
  if (transientPatterns.some((p) => lower.includes(p))) {
    return 'transient';
  }

  // 数据格式错误关键词
  const dataPatterns = ['文件不存在', 'not found', '格式', 'format', 'json', 'parse', '解析', '字段', 'field', 'missing', '缺失', 'invalid', '无效'];
  if (dataPatterns.some((p) => lower.includes(p))) {
    return 'data';
  }

  // 默认归类为逻辑错误
  return 'logic';
}

/**
 * 判断是否应该重试
 *
 * @param stageId - 阶段 id
 * @param retryCount - 当前已重试次数
 * @param maxRetries - 最大重试次数（默认 3）
 * @returns 是否应该重试
 */
export function shouldRetry(stageId: StageId, retryCount: number, maxRetries: number = 3): boolean {
  // 重试次数未超过上限时允许重试
  return retryCount < maxRetries;
}

/**
 * 计算重试等待时间（指数退避）
 *
 * @param attempt - 第几次重试（从 1 开始）
 * @param baseDelay - 基础延迟（毫秒，默认 2000）
 * @returns 等待时间（毫秒）
 */
export function getRetryDelay(attempt: number, baseDelay: number = 2000): number {
  return baseDelay * Math.pow(2, attempt - 1);
}
