import type { Rule } from '../types.js';

/**
 * 同一需求下场景名称必须唯一
 */
export const uniqueScenarioNamesRule: Rule = {
  id: 'unique-scenario-names',
  name: '场景名称唯一',
  level: 'ERROR',
  target: 'requirement',
  check: (ctx) => {
    const names = ctx.requirement!.scenarios.map((s) => s.name);
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const name of names) {
      if (seen.has(name)) {
        duplicates.push(name);
      }
      seen.add(name);
    }
    if (duplicates.length > 0) {
      return { message: `场景名称重复: ${duplicates.join(', ')}` };
    }
    return null;
  },
};
