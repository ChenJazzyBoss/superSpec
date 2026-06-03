import type { Rule } from '../types.js';

/**
 * 场景类型分布
 * 检测需求是否覆盖了多种场景类型
 */

type ScenarioType = 'happy-path' | 'error-case' | 'edge-case';

// 否定词列表
const NEGATION_WORDS = ['不', '没有', '未', '非', '免', '勿', '无'];

/**
 * 检查关键词是否在否定语境中
 * 如果关键词前面紧跟着否定词，则不算 error-case
 */
function isNegated(text: string, keyword: string): boolean {
  const idx = text.indexOf(keyword);
  if (idx <= 0) return false;
  // 检查关键词前面 1-2 个字符是否包含否定词
  const prefix = text.substring(Math.max(0, idx - 2), idx);
  return NEGATION_WORDS.some(neg => prefix.includes(neg));
}

/**
 * 检查文本是否是描述"处理某类场景"（而非功能本身失败）
 * 例如："处理失败的请求" → 是描述性文本，不算 error-case
 */
function isDescriptiveContext(text: string, keyword: string): boolean {
  const patterns = [
    /处理.*失败/,
    /处理.*错误/,
    /捕获.*错误/,
    /捕获.*异常/,
    /处理.*异常/,
    /避免.*失败/,
    /避免.*错误/,
    /防止.*失败/,
    /防止.*错误/,
    /不产生.*错误/,
    /不产生.*失败/,
    /不包含.*错误/,
    /不包含.*失败/,
    /输出.*通过/,
    /校验.*通过/,
  ];
  return patterns.some(p => p.test(text));
}

function classifyScenario(text: string, name: string): ScenarioType {
  const combined = `${name} ${text}`;
  const errorKeywords = ['错误', '失败', '异常', '无效', '非法', '超时', '拒绝', '不存在', '为空'];
  const edgeKeywords = ['边界', '极端', '最大', '最小', '空', '满', '溢出', '并发', '重复'];

  // 检查 error keywords，但排除否定语境和描述性语境
  for (const keyword of errorKeywords) {
    if (combined.includes(keyword)) {
      if (isNegated(combined, keyword)) continue;
      if (isDescriptiveContext(combined, keyword)) continue;
      return 'error-case';
    }
  }

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
