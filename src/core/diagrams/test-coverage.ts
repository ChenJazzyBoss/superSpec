/**
 * 测试覆盖矩阵图生成器
 * 从 Spec 数据生成 Mermaid 象限图，展示每个需求的场景覆盖情况
 */

import type { Spec, Requirement } from '../spec-schema.js';

/** 覆盖率数据，表示单个需求在象限图中的坐标 */
export interface CoverageData {
  /** 需求名称 */
  requirement: string;
  /** 复杂度，0-1 范围，基于文本长度和关键词数量计算 */
  complexity: number;
  /** 归一化后的场景数量，0-1 范围 */
  scenarioCount: number;
}

/** 用于计算复杂度的关键词列表 */
const COMPLEXITY_KEYWORDS = [
  'SHALL', 'MUST', 'SHOULD', 'MAY',
  '并且', '或者', '如果', '当', '必须', '应该',
];

/**
 * 计算单个需求的复杂度
 *
 * 复杂度由文本长度和关键词数量共同决定：
 * 1. 基础分 = min(text.length / 200, 1.0) * 0.5
 * 2. 关键词加分 = 包含的关键词数 * 0.1（上限 0.5）
 * 3. 复杂度 = min(基础分 + 关键词加分, 1.0)
 *
 * @param text - 需求文本
 * @returns 复杂度值，范围 0-1
 */
function calcComplexity(text: string): number {
  const baseScore = Math.min(text.length / 200, 1.0) * 0.5;

  let keywordCount = 0;
  for (const keyword of COMPLEXITY_KEYWORDS) {
    if (text.includes(keyword)) {
      keywordCount++;
    }
  }
  const keywordScore = Math.min(keywordCount * 0.1, 0.5);

  return Math.min(baseScore + keywordScore, 1.0);
}

/**
 * 将需求名称转为 Mermaid 象限图的点标签
 * 用双引号包裹，内部的双引号转义为 #quot;
 *
 * @param name - 需求名称
 * @returns 转义后的带引号标签
 */
function escapeLabel(name: string): string {
  const escaped = name.replace(/"/g, '#quot;');
  return `"${escaped}"`;
}

/**
 * 从 Spec 数据生成 Mermaid 象限图（quadrantChart）字符串
 *
 * 象限图展示每个需求在复杂度（x 轴）和场景覆盖数（y 轴）两个维度上的分布：
 * - 象限 1（右上）：高复杂度、多场景 —— 复杂但已覆盖
 * - 象限 2（左上）：低复杂度、多场景 —— 覆盖良好
 * - 象限 3（左下）：低复杂度、少场景 —— 可能过度简化
 * - 象限 4（右下）：高复杂度、少场景 —— 需要补充场景
 *
 * @param spec - Spec 数据对象
 * @returns Mermaid quadrantChart 字符串
 *
 * @example
 * ```ts
 * const mermaid = generateTestCoverageDiagram(spec);
 * console.log(mermaid);
 * // quadrantChart
 * //   title 需求测试覆盖矩阵
 * //   ...
 * ```
 */
export function generateTestCoverageDiagram(spec: Spec): string {
  const lines: string[] = [];

  lines.push('quadrantChart');
  lines.push('  title 需求测试覆盖矩阵');
  lines.push('  x-axis 低复杂度 --> 高复杂度');
  lines.push('  y-axis 少场景 --> 多场景');
  lines.push('  quadrant-1 需要补充场景');
  lines.push('  quadrant-2 覆盖良好');
  lines.push('  quadrant-3 可能过度简化');
  lines.push('  quadrant-4 复杂但已覆盖');

  if (spec.requirements.length === 0) {
    return lines.join('\n');
  }

  // 第一遍：计算所有需求的复杂度和场景数
  const coverages: CoverageData[] = spec.requirements.map((req: Requirement) => ({
    requirement: req.name,
    complexity: calcComplexity(req.text),
    scenarioCount: req.scenarios.length,
  }));

  // 归一化场景数量
  const maxCount = Math.max(...coverages.map((c) => c.scenarioCount), 0);
  for (const c of coverages) {
    c.scenarioCount = maxCount === 0 ? 0 : c.scenarioCount / maxCount;
  }

  // 输出每个需求的坐标
  for (const c of coverages) {
    const x = parseFloat(c.complexity.toFixed(2));
    const y = parseFloat(c.scenarioCount.toFixed(2));
    lines.push(`  ${escapeLabel(c.requirement)}: [${x}, ${y}]`);
  }

  return lines.join('\n');
}
