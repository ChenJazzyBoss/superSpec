/**
 * Delta Merge 算法
 *
 * 将 Delta（增量变更）应用到现有 Spec。
 * 执行顺序：REMOVED → MODIFIED → RENAMED → ADDED
 */

import type { Spec, Requirement, Scenario } from './spec-schema.js';
import { SpecSchema } from './spec-schema.js';
import type { Delta, Change, ChangeType } from './delta-schema.js';

/** 变更执行顺序 */
const CHANGE_ORDER: ChangeType[] = ['REMOVED', 'MODIFIED', 'RENAMED', 'ADDED'];

/**
 * 对 changes 按类型排序：REMOVED → MODIFIED → RENAMED → ADDED
 */
function sortChanges(changes: Change[]): Change[] {
  return [...changes].sort((a, b) => {
    return CHANGE_ORDER.indexOf(a.type) - CHANGE_ORDER.indexOf(b.type);
  });
}

/**
 * 应用单个变更到 spec
 */
function applyChange(spec: Spec, change: Change): Spec {
  switch (change.section) {
    case 'overview':
      return applyOverviewChange(spec, change);
    case 'requirement':
      return applyRequirementChange(spec, change);
    case 'scenario':
      return applyScenarioChange(spec, change);
    default:
      throw new Error(`未知的变更分组: ${change.section}`);
  }
}

function applyOverviewChange(spec: Spec, change: Change): Spec {
  if (change.type === 'MODIFIED') {
    return { ...spec, overview: change.newValue! };
  }
  throw new Error(`overview 不支持 ${change.type} 操作`);
}

function applyRequirementChange(spec: Spec, change: Change): Spec {
  const requirements = [...spec.requirements];

  switch (change.type) {
    case 'ADDED': {
      const newReq: Requirement = {
        name: change.target,
        text: change.content!,
        scenarios: [],
      };
      requirements.push(newReq);
      break;
    }
    case 'REMOVED': {
      const index = requirements.findIndex(r => r.name === change.target);
      if (index === -1) throw new Error(`未找到需求: ${change.target}`);
      requirements.splice(index, 1);
      break;
    }
    case 'MODIFIED': {
      const index = requirements.findIndex(r => r.name === change.target);
      if (index === -1) throw new Error(`未找到需求: ${change.target}`);
      requirements[index] = { ...requirements[index], text: change.newValue! };
      break;
    }
    case 'RENAMED': {
      const index = requirements.findIndex(r => r.name === change.target);
      if (index === -1) throw new Error(`未找到需求: ${change.target}`);
      requirements[index] = { ...requirements[index], name: change.newValue! };
      break;
    }
  }

  return { ...spec, requirements };
}

function applyScenarioChange(spec: Spec, change: Change): Spec {
  const requirements = [...spec.requirements];
  const parentIndex = requirements.findIndex(r => r.name === change.parent);

  if (parentIndex === -1) {
    throw new Error(`未找到父级需求: ${change.parent}`);
  }

  const scenarios = [...requirements[parentIndex].scenarios];

  switch (change.type) {
    case 'ADDED': {
      scenarios.push({ name: change.target, rawText: change.content! });
      break;
    }
    case 'REMOVED': {
      const index = scenarios.findIndex(s => s.name === change.target);
      if (index === -1) throw new Error(`未找到场景: ${change.target}`);
      scenarios.splice(index, 1);
      break;
    }
    case 'MODIFIED': {
      const index = scenarios.findIndex(s => s.name === change.target);
      if (index === -1) throw new Error(`未找到场景: ${change.target}`);
      scenarios[index] = { ...scenarios[index], rawText: change.newValue! };
      break;
    }
    case 'RENAMED': {
      const index = scenarios.findIndex(s => s.name === change.target);
      if (index === -1) throw new Error(`未找到场景: ${change.target}`);
      scenarios[index] = { ...scenarios[index], name: change.newValue! };
      break;
    }
  }

  requirements[parentIndex] = { ...requirements[parentIndex], scenarios };
  return { ...spec, requirements };
}

/**
 * 将 Delta 应用到 Spec
 *
 * 1. 按 REMOVED → MODIFIED → RENAMED → ADDED 顺序执行变更
 * 2. 对合并结果进行 Zod Schema 校验
 * 3. 校验失败抛出 Error
 *
 * @param spec 现有的 Spec 对象
 * @param delta 增量变更描述
 * @returns 合并后的 Spec 对象
 * @throws 如果合并结果不合法，抛出 Error
 */
export function applyDelta(spec: Spec, delta: Delta): Spec {
  const sorted = sortChanges(delta.changes);
  let result = { ...spec };

  for (const change of sorted) {
    result = applyChange(result, change);
  }

  // 合并后自动校验
  const validation = SpecSchema.safeParse(result);
  if (!validation.success) {
    const errors = validation.error.issues.map(i => i.message).join('; ');
    throw new Error(`Delta 合并结果不合法: ${errors}`);
  }

  return result;
}
