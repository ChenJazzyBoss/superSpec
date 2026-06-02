/**
 * 状态流转图生成器
 *
 * 从校验报告数据生成 Mermaid stateDiagram-v2，展示校验状态流转。
 * 纯字符串拼接实现，无外部依赖。
 */

import type { ValidationReport } from '../validator.js';

/**
 * 生成 Mermaid 状态流转图
 *
 * @param report - 校验报告
 * @param strictMode - 是否启用严格模式（warnings 视为失败）
 * @returns Mermaid stateDiagram-v2 格式字符串
 */
export function generateStateDiagram(report: ValidationReport, strictMode?: boolean): string {
  const lines: string[] = [];

  // 基础结构
  lines.push('stateDiagram-v2');
  lines.push('  [*] --> 待校验');
  lines.push('  待校验 --> 校验中 : 开始校验');

  // 判断是否包含各终态
  const hasErrors = report.summary.errors > 0;
  const hasWarnings = report.summary.warnings > 0;
  const passable = report.valid && !hasErrors;
  const showStrictFail = strictMode === true && hasWarnings;

  // 校验中 → 最终状态
  if (passable) {
    lines.push('  校验中 --> 通过 : errors=0');
  }

  if (hasErrors) {
    lines.push('  校验中 --> 有错误 : errors>0');
  }

  if (hasWarnings && !hasErrors) {
    lines.push('  校验中 --> 有警告 : warnings>0 && errors=0');
  }

  // 错误/警告 → 重新校验
  if (hasErrors) {
    lines.push('  有错误 --> 校验中 : 修复后重新校验');
  }

  if (hasWarnings && !hasErrors) {
    lines.push('  有警告 --> 校验中 : 修复后重新校验');
  }

  // strictMode 失败路径
  if (showStrictFail) {
    lines.push('  有警告 --> strictMode失败 : strictMode && warnings>0');
  }

  // 终态出口
  if (passable) {
    lines.push('  通过 --> [*]');
  }

  if (showStrictFail) {
    lines.push('  strictMode失败 --> [*]');
  }

  return lines.join('\n');
}
