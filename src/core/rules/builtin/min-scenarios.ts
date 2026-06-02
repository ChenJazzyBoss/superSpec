import type { Rule } from '../types.js';

/**
 * 每条需求至少需要 2 个场景
 */
export const minScenariosRule: Rule = {
  id: 'min-scenarios',
  name: '最少场景数',
  level: 'ERROR',
  target: 'requirement',
  check: (ctx) => {
    const count = ctx.requirement!.scenarios.length;
    if (count < 2) {
      return { message: `需求仅有 ${count} 个场景，至少需要 2 个` };
    }
    return null;
  },
};
