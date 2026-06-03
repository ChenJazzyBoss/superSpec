/**
 * Delta Spec 冲突检测器
 *
 * 检测 Delta Spec 中操作之间的逻辑冲突：
 * - 矛盾操作：同一 path 同时被 ADDED 和 REMOVED
 * - 路径冲突：RENAMED 目标路径与已有操作冲突
 */

import type { DeltaOperation, Conflict } from './types.js';

/**
 * 检测 Delta 操作列表中的冲突
 *
 * 检测规则：
 * 1. 矛盾操作（error）：同一 path 同时出现 ADDED + REMOVED
 * 2. 路径冲突（error）：RENAMED 的 newPath 与已有操作的 path 冲突
 *
 * @param operations - Delta 操作列表
 * @returns 检测到的冲突列表，空数组表示无冲突
 */
export function detectConflicts(operations: DeltaOperation[]): Conflict[] {
  const conflicts: Conflict[] = [];

  // 构建路径到操作的映射
  const addedPaths = new Set<string>();
  const removedPaths = new Set<string>();
  const renamedNewPaths = new Map<string, string>(); // newPath -> oldPath

  for (const op of operations) {
    const path = op.operation === 'RENAMED'
      ? (op as { oldPath: string; newPath: string }).newPath
      : op.path;

    switch (op.operation) {
      case 'ADDED':
        addedPaths.add(op.path);
        break;
      case 'REMOVED':
        removedPaths.add(op.path);
        break;
      case 'RENAMED': {
        const renamed = op as { oldPath: string; newPath: string };
        renamedNewPaths.set(renamed.newPath, renamed.oldPath);
        break;
      }
    }
  }

  // 检测矛盾操作：同一 path 同时 ADDED + REMOVED
  for (const path of addedPaths) {
    if (removedPaths.has(path)) {
      conflicts.push({
        severity: 'error',
        type: 'contradiction',
        path,
        detail: `路径 "${path}" 同时存在 ADDED 和 REMOVED 操作，这是矛盾的`,
        suggestion: `请移除其中一个操作，或确认是否需要先添加再删除`,
      });
    }
  }

  // 检测路径冲突：RENAMED 的 newPath 与 ADDED 的 path 冲突
  for (const [newPath, oldPath] of renamedNewPaths) {
    if (addedPaths.has(newPath)) {
      conflicts.push({
        severity: 'error',
        type: 'path',
        path: newPath,
        detail: `RENAMED 将 "${oldPath}" 重命名为 "${newPath}"，但 "${newPath}" 同时被 ADDED 操作占用`,
        suggestion: `请使用不同的目标路径，或移除冲突的 ADDED 操作`,
      });
    }
  }

  // 检测路径冲突：多个 RENAMED 操作目标到同一 newPath
  const newPathCounts = new Map<string, string[]>();
  for (const op of operations) {
    if (op.operation === 'RENAMED') {
      const renamed = op as { oldPath: string; newPath: string };
      const sources = newPathCounts.get(renamed.newPath) ?? [];
      sources.push(renamed.oldPath);
      newPathCounts.set(renamed.newPath, sources);
    }
  }

  for (const [newPath, sources] of newPathCounts) {
    if (sources.length > 1) {
      conflicts.push({
        severity: 'error',
        type: 'path',
        path: newPath,
        detail: `多个 RENAMED 操作（${sources.map(s => `"${s}"`).join(', ')}）同时重命名为 "${newPath}"`,
        suggestion: `请确保每个 RENAMED 操作使用唯一的目标路径`,
      });
    }
  }

  return conflicts;
}
