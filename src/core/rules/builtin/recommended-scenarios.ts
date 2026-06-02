import type { Rule } from '../types.js';
import { RECOMMENDED_SCENARIO_COUNT } from '../../config.js';

/**
 * 推荐场景数量
 * 每条需求建议至少 3 个场景以提高验证覆盖率
 */
export const recommendedScenariosRule: Rule = {
  id: 'recommended-scenarios',
  name: '推荐场景数',
  level: 'WARNING',
  target: 'requirement',
  check: (ctx) => {
    const count = ctx.requirement!.scenarios.length;
    if (count < RECOMMENDED_SCENARIO_COUNT) {
      return {
        message: `需求 "${ctx.requirement!.name}" 的场景数量不足推荐值（当前 ${count} 个，推荐至少 ${RECOMMENDED_SCENARIO_COUNT} 个以提高验证覆盖率）`,
      };
    }
    return null;
  },
};
