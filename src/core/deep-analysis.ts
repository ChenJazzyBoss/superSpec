/**
 * 深度逻辑一致性分析
 *
 * 可选的深度检查模式（--deep），检查：
 * 1. 场景间的逻辑矛盾
 * 2. 场景对需求约束的覆盖度
 *
 * 所有结果以 WARNING 级别报告，不阻断校验。
 */

import type { Spec, Requirement, Scenario } from './spec-schema.js';

/** 深度分析结果 */
export interface DeepAnalysisResult {
  level: 'WARNING';
  path: string;
  message: string;
}

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
 * 检测需求内场景间的逻辑矛盾
 *
 * 查找场景中互相冲突的数值约束：
 * - 场景 A 说"超过 100 条拒绝"，场景 B 说"200 条成功"
 */
function detectContradictions(req: Requirement, reqIndex: number): DeepAnalysisResult[] {
  const results: DeepAnalysisResult[] = [];
  const scenarios = req.scenarios;

  for (let i = 0; i < scenarios.length; i++) {
    for (let j = i + 1; j < scenarios.length; j++) {
      const a = scenarios[i];
      const b = scenarios[j];
      const aGWT = extractGWT(a.rawText);
      const bGWT = extractGWT(b.rawText);

      // 检查数值矛盾：一个说拒绝，另一个说成功
      const aRejects = /拒绝|禁止|不允许|失败/.test(aGWT.then);
      const bAllows = /成功|通过|完成|下载|生成/.test(bGWT.then);

      if (aRejects && bAllows) {
        const aLimits = aGWT.given.match(/\d+/g) ?? aGWT.when.match(/\d+/g) ?? [];
        const bValues = bGWT.given.match(/\d+/g) ?? bGWT.when.match(/\d+/g) ?? [];

        for (const aLim of aLimits) {
          for (const bVal of bValues) {
            if (parseInt(bVal) > parseInt(aLim)) {
              results.push({
                level: 'WARNING',
                path: `requirements[${reqIndex}]`,
                message: `场景间可能存在逻辑矛盾：场景 "${a.name}" 在超过 ${aLim} 时拒绝，但场景 "${b.name}" 测试了 ${bVal} 并期望成功`,
              });
            }
          }
        }
      }

      // 检查条件矛盾：相同条件不同结果
      if (aGWT.given === bGWT.given && aGWT.when === bGWT.when && aGWT.then !== bGWT.then) {
        results.push({
          level: 'WARNING',
          path: `requirements[${reqIndex}]`,
          message: `场景 "${a.name}" 和 "${b.name}" 条件相同但预期结果不同`,
        });
      }
    }
  }

  return results;
}

/**
 * 检测场景对需求约束的覆盖度
 *
 * 如果需求描述提到了多个值（如三种格式），检查场景是否都覆盖了
 */
function detectCoverageGaps(req: Requirement, reqIndex: number): DeepAnalysisResult[] {
  const results: DeepAnalysisResult[] = [];

  const allText = `${req.name} ${req.text}`;

  // 提取枚举值（如 CSV、XLSX、PDF）
  const enumValues = allText.match(/[A-Z]{2,}/g) ?? [];
  const chineseValues = allText.match(/[^，。、\s]{2,}(?=[、]|(?:和|及))/g) ?? [];
  const allValues = [...new Set([...enumValues, ...chineseValues])];

  if (allValues.length <= 1) return results;

  const scenarioTexts = req.scenarios.map(
    (s) => `${s.name} ${s.rawText}`
  );
  const allScenarioText = scenarioTexts.join(' ');

  const uncovered = allValues.filter((v) => !allScenarioText.includes(v));
  if (uncovered.length > 0) {
    results.push({
      level: 'WARNING',
      path: `requirements[${reqIndex}]`,
      message: `需求 "${req.name}" 提到了 ${allValues.join('、')}，但场景未覆盖：${uncovered.join('、')}`,
    });
  }

  return results;
}

/**
 * 执行深度逻辑一致性分析
 */
export function runDeepAnalysis(spec: Spec): DeepAnalysisResult[] {
  const results: DeepAnalysisResult[] = [];

  for (const [ri, req] of spec.requirements.entries()) {
    results.push(...detectContradictions(req, ri));
    results.push(...detectCoverageGaps(req, ri));
  }

  return results;
}
