import type { Rule } from '../types.js';

/**
 * 需求可测试性检查
 * 标记难以自动化验证的主观性需求
 */
const SUBJECTIVE_KEYWORDS = [
  '良好',
  '友好',
  '直观',
  '美观',
  '流畅',
  '舒适',
  '自然',
  '合理',
  '合适',
  '方便',
  '简单',
  '高效',
];

const QUANTIFIABLE_KEYWORDS = [
  /\d+\s*(ms|毫秒|秒|s)/i,
  /\d+\s*%/,
  /\d+\s*(个|条|次|次\/秒)/,
  /<=?\s*\d+/,
  />=?\s*\d+/,
];

export const testabilityRule: Rule = {
  id: 'testability',
  name: '可测试性检查',
  level: 'INFO',
  target: 'requirement',
  check: (ctx) => {
    const text = ctx.requirement!.text;

    // 检查是否有量化指标
    const hasQuantifiable = QUANTIFIABLE_KEYWORDS.some((pattern) =>
      pattern.test(text),
    );
    if (hasQuantifiable) return null;

    // 检查是否有主观性词汇
    const found = SUBJECTIVE_KEYWORDS.filter((word) => text.includes(word));
    if (found.length > 0) {
      return {
        message: `需求包含主观性表述（${found.join(', ')}），难以自动化验证。建议添加量化指标`,
      };
    }

    return null;
  },
};
