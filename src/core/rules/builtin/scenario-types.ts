import type { Rule } from '../types.js';

/**
 * 场景类型分布
 * 检测需求是否覆盖了多种场景类型
 */

type ScenarioType = 'happy-path' | 'error-case' | 'edge-case';

function classifyScenario(text: string, name: string): ScenarioType {
  const combined = `${name} ${text}`;
  const errorKeywords = ['错误', '失败', '异常', '无效', '非法', '超时', '拒绝', '不存在', '为空'];
  const edgeKeywords = ['边界', '极端', '最大', '最小', '空', '满', '溢出', '并发', '重复'];

  if (errorKeywords.some((k) => combined.includes(k))) return 'error-case';
  if (edgeKeywords.some((k) => combined.includes(k))) return 'edge-case';
  return 'happy-path';
}

const TYPE_LABELS: Record<ScenarioType, string> = {
  'happy-path': '正常流程',
  'error-case': '异常场景',
  'edge-case': '边界条件',
};

export const scenarioTypesRule: Rule = {
  id: 'scenario-types',
  name: '场景类型分布',
  level: 'WARNING',
  target: 'requirement',
  check: (ctx) => {
    const scenarios = ctx.requirement!.scenarios;
    if (scenarios.length < 2) return null; // min-scenarios 规则会报错

    const types = new Set<ScenarioType>();
    for (const s of scenarios) {
      types.add(classifyScenario(s.rawText, s.name));
    }

    if (types.size < 2) {
      const covered = [...types].map((t) => TYPE_LABELS[t]).join(', ');
      return {
        message: `场景类型单一（仅覆盖: ${covered}）。建议至少覆盖正常流程和异常场景`,
      };
    }
    return null;
  },
};
