/**
 * 任务分解图生成器
 * 从 Spec 数据生成 Mermaid flowchart，展示需求→场景分解结构
 */

import type { Spec, Scenario } from '../spec-schema.js';

/** 场景类型 */
type ScenarioType = 'happy-path' | 'error-case' | 'edge-case' | 'default';

/** 场景类型对应的 emoji */
const TYPE_EMOJI: Record<ScenarioType, string> = {
  'happy-path': '✅',
  'error-case': '❌',
  'edge-case': '⚠️',
  default: '📝',
};

/** 场景类型对应的 CSS 类名 */
const TYPE_CLASS: Record<ScenarioType, string> = {
  'happy-path': 'happy',
  'error-case': 'error',
  'edge-case': 'edge',
  default: 'default',
};

/**
 * 根据场景名称判断场景类型
 * @param name - 场景名称
 * @returns 场景类型
 */
function classifyScenario(name: string): ScenarioType {
  const lower = name.toLowerCase();

  if (/正常|成功|happy|success/.test(lower)) {
    return 'happy-path';
  }
  if (/错误|失败|异常|error|fail|invalid/.test(lower)) {
    return 'error-case';
  }
  if (/边界|极端|最大|最小|edge|boundary|max|min/.test(lower)) {
    return 'edge-case';
  }
  return 'default';
}

/**
 * 转义 Mermaid 节点标签中的特殊字符
 * @param text - 原始文本
 * @returns 转义后的文本
 */
function escapeLabel(text: string): string {
  return text.replace(/"/g, '#quot;');
}

/**
 * 从 Spec 数据生成 Mermaid flowchart 字符串
 *
 * @param spec - Spec 数据对象
 * @returns Mermaid flowchart 字符串
 *
 * @example
 * ```ts
 * const mermaid = generateFlowchart(spec);
 * console.log(mermaid);
 * // flowchart TB
 * //   subgraph spec["📋 spec-name"]
 * //     ...
 * //   end
 * ```
 */
export function generateFlowchart(spec: Spec): string {
  const lines: string[] = [];
  const classAssignments: string[] = [];

  lines.push('flowchart TB');
  lines.push(`  subgraph spec["📋 ${escapeLabel(spec.name)}"]`);
  lines.push('    direction TB');

  for (let ri = 0; ri < spec.requirements.length; ri++) {
    const req = spec.requirements[ri];
    lines.push(`    subgraph req${ri}["🔑 ${escapeLabel(req.name)}"]`);

    for (let si = 0; si < req.scenarios.length; si++) {
      const scenario: Scenario = req.scenarios[si];
      const nodeId = `R${ri}S${si}`;
      const scenarioType = classifyScenario(scenario.name);
      const emoji = TYPE_EMOJI[scenarioType];
      const cssClass = TYPE_CLASS[scenarioType];

      lines.push(`      ${nodeId}["${emoji} ${escapeLabel(scenario.name)}"]`);
      classAssignments.push(`  class ${nodeId} ${cssClass}`);
    }

    lines.push('    end');
  }

  lines.push('  end');

  // 添加样式声明
  lines.push('');
  lines.push('  classDef happy fill:#d4edda,stroke:#28a745,color:#155724');
  lines.push('  classDef error fill:#f8d7da,stroke:#dc3545,color:#721c24');
  lines.push('  classDef edge fill:#fff3cd,stroke:#ffc107,color:#856404');
  lines.push('  classDef default fill:#e2e3e5,stroke:#6c757d,color:#383d41');

  // 应用样式
  if (classAssignments.length > 0) {
    lines.push('');
    for (const assignment of classAssignments) {
      lines.push(assignment);
    }
  }

  return lines.join('\n');
}
