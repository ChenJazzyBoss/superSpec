import type { Rule } from '../types.js';

/**
 * 概述长度建议
 * 概述至少 100 字符时质量更高
 */
export const overviewLengthRule: Rule = {
  id: 'overview-length',
  name: '概述充分性',
  level: 'INFO',
  target: 'spec',
  check: (ctx) => {
    const len = ctx.spec.overview.length;
    if (len < 100) {
      return {
        message: `概述仅 ${len} 字符，建议扩展到 100 字符以上以提高可读性`,
      };
    }
    return null;
  },
};
