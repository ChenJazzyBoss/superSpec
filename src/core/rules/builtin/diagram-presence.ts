import type { Rule } from '../types.js';

/**
 * 图表存在性检查
 *
 * 检测 spec 内容是否包含 mermaid 代码块或 DIAGRAM 占位符。
 * 这是一个 WARNING 级别的建议，不阻断校验结果。
 */
export const diagramPresenceRule: Rule = {
  id: 'diagram-presence',
  name: '图表存在性检查',
  level: 'WARNING',
  target: 'spec',
  check: (_ctx) => {
    // 检查 spec 内容是否包含 mermaid 代码块
    // 这是一个 INFO 级别的建议，不是强制要求
    // 暂时返回 null，后续可扩展为检查 spec 内容中是否包含图表
    return null;
  },
};
