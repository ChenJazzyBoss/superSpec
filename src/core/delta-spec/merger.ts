/**
 * Delta Spec 合并器
 *
 * 将 Delta Spec 的操作应用到基准 Spec 上，生成合并后的完整 Spec。
 * 支持 ADDED、MODIFIED、REMOVED、RENAMED 四种操作。
 */

import type { DeltaSpec, MergeResult } from './types.js';
import { validateDeltaFormat } from './validator.js';
import { detectConflicts } from './conflict-detector.js';

/**
 * 将 Delta Spec 应用到基准 Spec
 *
 * 合并流程：
 * 1. 格式校验 Delta Spec
 * 2. 冲突检测
 * 3. 按顺序应用每个操作
 *
 * @param baseSpec - 基准 Spec 内容（文本形式）
 * @param delta - Delta Spec
 * @returns 合并结果，包含成功标志、合并内容或冲突信息、操作日志
 */
export function applyDelta(baseSpec: string, delta: DeltaSpec): MergeResult {
  const log: string[] = [];

  // 1. 格式校验
  const formatResult = validateDeltaFormat(delta);
  if (!formatResult.valid) {
    log.push('格式校验失败');
    for (const err of formatResult.errors) {
      log.push(`  - ${err}`);
    }
    return { success: false, conflicts: [], log };
  }
  log.push('格式校验通过');

  // 2. 冲突检测
  const conflicts = detectConflicts(delta.operations);
  if (conflicts.length > 0) {
    log.push(`检测到 ${conflicts.length} 个冲突`);
    for (const conflict of conflicts) {
      log.push(`  - [${conflict.severity}] ${conflict.type}: ${conflict.detail}`);
    }
    return { success: false, conflicts, log };
  }
  log.push('冲突检测通过，无冲突');

  // 3. 按顺序应用操作
  let result = baseSpec;

  for (let i = 0; i < delta.operations.length; i++) {
    const op = delta.operations[i];
    log.push(`应用操作 [${i}]: ${op.operation} ${op.operation === 'RENAMED' ? (op as { oldPath: string; newPath: string }).oldPath : op.path}`);

    switch (op.operation) {
      case 'ADDED': {
        const added = op as { path: string; content: string };
        // 在基准内容末尾追加新内容，以路径作为标识
        result = result + `\n\n[${added.path}]\n${added.content}`;
        log.push(`  -> 已添加内容到路径 "${added.path}"`);
        break;
      }
      case 'MODIFIED': {
        const modified = op as { path: string; before: string; after: string };
        if (!result.includes(modified.before)) {
          log.push(`  -> 错误: 未找到待修改内容 "${modified.before}"`);
          return {
            success: false,
            conflicts: [{
              severity: 'error',
              type: 'dependency',
              path: modified.path,
              detail: `MODIFIED 操作的 before 内容在当前 Spec 中未找到`,
            }],
            log,
          };
        }
        result = result.replace(modified.before, modified.after);
        log.push(`  -> 已修改路径 "${modified.path}" 的内容`);
        break;
      }
      case 'REMOVED': {
        const removed = op as { path: string; content: string };
        if (!result.includes(removed.content)) {
          log.push(`  -> 错误: 未找到待删除内容 "${removed.content}"`);
          return {
            success: false,
            conflicts: [{
              severity: 'error',
              type: 'dependency',
              path: removed.path,
              detail: `REMOVED 操作的 content 在当前 Spec 中未找到`,
            }],
            log,
          };
        }
        result = result.replace(removed.content, '');
        // 清理多余的空行
        result = result.replace(/\n{3,}/g, '\n\n').trim();
        log.push(`  -> 已删除路径 "${removed.path}" 的内容`);
        break;
      }
      case 'RENAMED': {
        const renamed = op as { oldPath: string; newPath: string };
        if (!result.includes(renamed.oldPath)) {
          log.push(`  -> 错误: 未找到待重命名路径 "${renamed.oldPath}"`);
          return {
            success: false,
            conflicts: [{
              severity: 'error',
              type: 'path',
              path: renamed.oldPath,
              detail: `RENAMED 操作的 oldPath "${renamed.oldPath}" 在当前 Spec 中未找到`,
            }],
            log,
          };
        }
        result = result.replaceAll(renamed.oldPath, renamed.newPath);
        log.push(`  -> 已将 "${renamed.oldPath}" 重命名为 "${renamed.newPath}"`);
        break;
      }
    }
  }

  log.push(`合并完成，共应用 ${delta.operations.length} 个操作`);
  return { success: true, result, log };
}
