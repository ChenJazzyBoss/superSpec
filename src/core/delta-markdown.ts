/**
 * Spec → Markdown 转换器
 *
 * 将结构化的 Spec 对象转换为 Markdown 格式的 spec 文件。
 */

import type { Spec } from './spec-schema.js';

/**
 * 去掉 name 中已有的 "Requirement: " 或 "Scenario: " 前缀
 * parseSpec 会将完整标题存入 name（如 "Requirement: login-validation"），
 * generateSpecContent 需要避免重复添加前缀。
 */
function stripPrefix(name: string, prefix: string): string {
  if (name.startsWith(prefix)) {
    return name.slice(prefix.length).trim();
  }
  return name;
}

/**
 * 将 Spec 转换为 Markdown 字符串
 */
export function generateSpecContent(spec: Spec): string {
  const lines: string[] = [];

  lines.push(`# ${spec.name}`);
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push(spec.overview);
  lines.push('');
  lines.push('## Requirements');

  for (const req of spec.requirements) {
    const reqName = stripPrefix(req.name, 'Requirement:');
    lines.push('');
    lines.push(`### Requirement: ${reqName}`);
    lines.push(req.text);

    for (const scenario of req.scenarios) {
      const scenarioName = stripPrefix(scenario.name, 'Scenario:');
      lines.push('');
      lines.push(`#### Scenario: ${scenarioName}`);
      lines.push(scenario.rawText);
    }
  }

  lines.push('');
  return lines.join('\n');
}
