/**
 * spec diff 模块
 *
 * 对比两个 Spec 对象，输出结构化变更。
 */

import type { Spec, Requirement, Scenario } from '../core/spec-schema.js';

/** 变更类型 */
export type DiffType = 'ADDED' | 'REMOVED' | 'MODIFIED';

/** 变更项 */
export interface DiffItem {
  type: DiffType;
  section: 'overview' | 'requirement' | 'scenario';
  target: string;
  parent?: string;
  detail?: string;
}

/** diff 结果 */
export interface DiffResult {
  items: DiffItem[];
  hasChanges: boolean;
}

/**
 * 对比两个 Spec 对象
 */
export function diffSpec(current: Spec, previous: Spec): DiffResult {
  const items: DiffItem[] = [];

  // 1. 对比 overview
  if (current.overview !== previous.overview) {
    items.push({
      type: 'MODIFIED',
      section: 'overview',
      target: '概述',
      detail: '概述内容已变更',
    });
  }

  // 2. 建立 requirement 索引
  const currentReqs = new Map(current.requirements.map(r => [r.name, r]));
  const previousReqs = new Map(previous.requirements.map(r => [r.name, r]));

  // 3. 检查新增和删除的 requirements
  for (const [name] of currentReqs) {
    if (!previousReqs.has(name)) {
      items.push({ type: 'ADDED', section: 'requirement', target: name });
    }
  }
  for (const [name] of previousReqs) {
    if (!currentReqs.has(name)) {
      items.push({ type: 'REMOVED', section: 'requirement', target: name });
    }
  }

  // 4. 对比共有的 requirements 下的 scenarios
  for (const [name, currentReq] of currentReqs) {
    const previousReq = previousReqs.get(name);
    if (!previousReq) continue;

    // 检查 requirement text 变更
    if (currentReq.text !== previousReq.text) {
      items.push({
        type: 'MODIFIED',
        section: 'requirement',
        target: name,
        detail: '需求描述已变更',
      });
    }

    // 对比 scenarios
    const currentScenarios = new Map(currentReq.scenarios.map(s => [s.name, s]));
    const previousScenarios = new Map(previousReq.scenarios.map(s => [s.name, s]));

    for (const [sName] of currentScenarios) {
      if (!previousScenarios.has(sName)) {
        items.push({ type: 'ADDED', section: 'scenario', target: sName, parent: name });
      }
    }
    for (const [sName] of previousScenarios) {
      if (!currentScenarios.has(sName)) {
        items.push({ type: 'REMOVED', section: 'scenario', target: sName, parent: name });
      }
    }

    // 对比共有 scenario 的内容
    for (const [sName, currentScenario] of currentScenarios) {
      const previousScenario = previousScenarios.get(sName);
      if (!previousScenario) continue;

      if (
        JSON.stringify(currentScenario.given) !== JSON.stringify(previousScenario.given) ||
        JSON.stringify(currentScenario.when) !== JSON.stringify(previousScenario.when) ||
        JSON.stringify(currentScenario.then) !== JSON.stringify(previousScenario.then)
      ) {
        items.push({
          type: 'MODIFIED',
          section: 'scenario',
          target: sName,
          parent: name,
          detail: '场景步骤已变更',
        });
      }
    }
  }

  return { items, hasChanges: items.length > 0 };
}

/**
 * 格式化 diff 输出
 */
export function formatDiff(specName: string, result: DiffResult): string {
  if (!result.hasChanges) {
    return `📋 spec "${specName}" 变更对比\n\n无变更`;
  }

  const lines: string[] = [`📋 spec "${specName}" 变更对比\n`];

  for (const item of result.items) {
    const prefix = item.type === 'ADDED' ? '+' : item.type === 'REMOVED' ? '-' : '~';
    const label = item.type === 'ADDED' ? '新增' : item.type === 'REMOVED' ? '删除' : '修改';
    const sectionLabel =
      item.section === 'overview' ? '概述' :
      item.section === 'requirement' ? '需求' : '场景';

    let line = `  ${prefix} ${label}${sectionLabel}: ${item.target}`;
    if (item.parent) line += ` (在 ${item.parent} 下)`;
    if (item.detail) line += ` — ${item.detail}`;
    lines.push(line);
  }

  lines.push(`\n共 ${result.items.length} 处变更`);
  return lines.join('\n');
}
