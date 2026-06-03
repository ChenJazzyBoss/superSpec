import type { XmlTag } from '../types.js';

/**
 * SUBAGENT-STOP 行为约束引擎
 * 如果是子代理上下文且存在 SUBAGENT-STOP 标签，子代理应跳过当前技能
 *
 * @param tags - 已解析的标签列表
 * @param isSubagent - 当前是否处于子代理上下文
 * @returns true 表示应跳过当前技能，false 表示正常执行
 */
export function shouldSkipForSubagent(tags: XmlTag[], isSubagent: boolean): boolean {
  if (!isSubagent) {
    return false;
  }
  return tags.some(t => t.type === 'SUBAGENT-STOP');
}
