import type { Rule } from '../types.js';

/**
 * 需求名称必须唯一
 */
export const uniqueReqNamesRule: Rule = {
  id: 'unique-req-names',
  name: '需求名称唯一',
  level: 'ERROR',
  target: 'spec',
  check: (ctx) => {
    const names = ctx.spec.requirements.map((r) => r.name);
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const name of names) {
      if (seen.has(name)) {
        duplicates.push(name);
      }
      seen.add(name);
    }
    if (duplicates.length > 0) {
      return { message: `需求名称重复: ${duplicates.join(', ')}` };
    }
    return null;
  },
};
