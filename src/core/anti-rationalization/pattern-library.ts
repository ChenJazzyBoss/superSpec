/**
 * 反跳步模式库
 *
 * 维护可扩展的反跳步模式库，收录常见的 AI 跳步模式和对应的检测规则。
 * 支持内置模式和自定义模式，用于在技能执行过程中实时检测跳步行为。
 */

import type { SkipPattern } from './types.js';

/**
 * 内置反跳步模式列表
 *
 * 包含三种最常见的 AI 跳步行为：
 * - 无 spec 编码：检测到编码操作但无 spec 文件
 * - 跳过校验：声称完成但未运行校验
 * - 选择性报告：只报告通过的规则
 */
const BUILTIN_PATTERNS: SkipPattern[] = [
  {
    id: 'no-spec-coding',
    name: '无 spec 编码',
    description: '检测到编码操作但无 spec 文件',
    detector: (ctx: string) => ctx.includes('写代码') && !ctx.includes('spec'),
    remediation: '必须先生成 spec 文件再编码',
  },
  {
    id: 'skip-validation',
    name: '跳过校验',
    description: '声称完成但未运行校验',
    detector: (ctx: string) => ctx.includes('完成') && !ctx.includes('valid'),
    remediation: '必须运行 validate-spec 并获得 valid: true',
  },
  {
    id: 'selective-reporting',
    name: '选择性报告',
    description: '只报告通过的规则',
    detector: (ctx: string) => ctx.includes('通过') && !ctx.includes('失败'),
    remediation: '必须报告所有校验结果，包括失败的',
  },
];

/**
 * 获取内置模式列表
 *
 * 返回内置反跳步模式的只读副本，防止外部修改。
 *
 * @returns 内置模式数组的副本
 */
export function getBuiltinPatterns(): SkipPattern[] {
  return [...BUILTIN_PATTERNS];
}

/**
 * 检测上下文中的跳步模式
 *
 * 将上下文文本与模式库中的检测规则进行匹配。
 * 优先使用传入的自定义模式，若未提供则使用内置模式。
 * 返回所有匹配到的跳步模式。
 *
 * @param context - 待检测的上下文文本（如 AI 输出、操作描述等）
 * @param patterns - 可选的自定义模式列表，默认使用内置模式
 * @returns 匹配到的跳步模式数组，无匹配返回空数组
 */
export function detectSkipPatterns(context: string, patterns?: SkipPattern[]): SkipPattern[] {
  if (!context || context.trim().length === 0) {
    return [];
  }

  const patternsToCheck = patterns ?? BUILTIN_PATTERNS;
  const matched: SkipPattern[] = [];

  for (const pattern of patternsToCheck) {
    try {
      if (pattern.detector(context)) {
        matched.push(pattern);
      }
    } catch {
      // 检测函数异常时跳过该模式，不影响其他模式检测
    }
  }

  return matched;
}
