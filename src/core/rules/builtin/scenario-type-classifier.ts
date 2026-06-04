/**
 * 场景类型识别规则
 *
 * 自动识别每个场景的类型（正常流程、异常处理、边界条件），
 * 并在需求缺少异常处理场景时给出 WARNING。
 */

import type { Rule } from '../types.js';

/** 场景类型 */
export type ScenarioCategory = 'normal' | 'error' | 'boundary';

/** 异常处理关键词 */
const ERROR_KEYWORDS = /错误|失败|异常|超时|不可用|拒绝|无效|非法|error|fail|exception|timeout|invalid|reject/i;

/** 边界条件关键词 */
const BOUNDARY_KEYWORDS = /为空|空值|null|undefined|超出|超过|恰好|最大|最小|上限|下限|边界|零|负数|edge|boundary|null|empty|zero|max|min/i;

/**
 * 从 rawText 中提取 Given/When/Then
 */
function extractGWT(rawText: string): { given: string; when: string; then: string } {
  const given = rawText.match(/Given\s+(.*?)(?:\n|$)/i)?.[1] ?? '';
  const when = rawText.match(/When\s+(.*?)(?:\n|$)/i)?.[1] ?? '';
  const then = rawText.match(/Then\s+(.*?)(?:\n|$)/i)?.[1] ?? '';
  return { given, when, then };
}

/**
 * 根据场景的 Given/When/Then 内容判断场景类型
 */
export function classifyScenario(given: string, when: string, then: string): ScenarioCategory {
  const text = `${given} ${when} ${then}`;
  if (ERROR_KEYWORDS.test(text)) return 'error';
  if (BOUNDARY_KEYWORDS.test(text)) return 'boundary';
  return 'normal';
}

/**
 * 场景类型识别规则
 * 在校验报告中标注每个场景的类型，并在需求缺少异常场景时警告
 */
export const scenarioTypeClassifierRule: Rule = {
  id: 'scenario-type-classifier',
  name: '场景类型识别',
  level: 'WARNING',
  target: 'requirement',
  check: (ctx) => {
    if (!ctx.requirement) return null;

    const categories: ScenarioCategory[] = ctx.requirement.scenarios.map((s) => {
      const { given, when, then } = extractGWT(s.rawText);
      return classifyScenario(given, when, then);
    });

    const hasError = categories.includes('error');
    const scenarioCount = ctx.requirement.scenarios.length;

    // 只有当场景数 >= 2 且全部是正常流程时才警告
    if (scenarioCount >= 2 && !hasError) {
      return {
        message: `需求 "${ctx.requirement.name}" 缺少异常处理场景，当前 ${scenarioCount} 个场景全部为正常流程`,
      };
    }

    return null;
  },
};
