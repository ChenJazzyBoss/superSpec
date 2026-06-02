import type { Rule } from '../types.js';

/**
 * 需求文本必须包含 SHALL 或 MUST 关键词
 */
export const requireShallRule: Rule = {
  id: 'require-shall',
  name: 'SHALL/MUST 关键词',
  level: 'ERROR',
  target: 'requirement',
  check: (ctx) => {
    const text = ctx.requirement!.text;
    if (!text.includes('SHALL') && !text.includes('MUST')) {
      return { message: '需求文本必须包含 SHALL 或 MUST 关键词' };
    }
    return null;
  },
};
