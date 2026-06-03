/**
 * Delta Spec 校验器
 *
 * 提供格式校验和语义校验两层验证：
 * - 格式校验：检查 Delta Spec 结构的完整性
 * - 语义校验：检查 Delta 操作与基准 Spec 的一致性
 */

import type { DeltaSpec, DeltaOperation } from './types.js';

/** 校验结果 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 格式校验 — 检查 Delta Spec 结构的完整性
 *
 * 校验规则：
 * - 必须有 baseSpec 字段（非空字符串）
 * - 必须有 operations 数组
 * - 每个操作必须有 operation 和 path 字段
 * - ADDED 操作必须有 content 字段
 * - MODIFIED 操作必须有 before 和 after 字段
 * - REMOVED 操作必须有 content 字段
 * - RENAMED 操作必须有 oldPath 和 newPath 字段
 *
 * @param delta - 待校验的 Delta Spec
 * @returns 校验结果，包含 valid 标志和 errors 列表
 */
export function validateDeltaFormat(delta: DeltaSpec): ValidationResult {
  const errors: string[] = [];

  // baseSpec 校验
  if (!delta.baseSpec || typeof delta.baseSpec !== 'string' || delta.baseSpec.trim() === '') {
    errors.push('缺少 baseSpec 字段或 baseSpec 为空');
  }

  // operations 数组校验
  if (!Array.isArray(delta.operations)) {
    errors.push('缺少 operations 数组');
    return { valid: false, errors };
  }

  if (delta.operations.length === 0) {
    errors.push('operations 数组不能为空');
  }

  // 逐项校验每个操作
  for (let i = 0; i < delta.operations.length; i++) {
    const op = delta.operations[i];
    const prefix = `operations[${i}]`;

    if (!op.operation) {
      errors.push(`${prefix}: 缺少 operation 字段`);
      continue;
    }

    if (!['ADDED', 'MODIFIED', 'REMOVED', 'RENAMED'].includes(op.operation)) {
      errors.push(`${prefix}: 无效的 operation 类型 "${op.operation}"`);
      continue;
    }

    // RENAMED 使用 oldPath/newPath，其他操作使用 path
    if (op.operation === 'RENAMED') {
      const renamed = op as { oldPath?: string; newPath?: string };
      if (!renamed.oldPath || typeof renamed.oldPath !== 'string') {
        errors.push(`${prefix} (RENAMED): 缺少 oldPath 字段`);
      }
      if (!renamed.newPath || typeof renamed.newPath !== 'string') {
        errors.push(`${prefix} (RENAMED): 缺少 newPath 字段`);
      }
    } else {
      if (!op.path || typeof op.path !== 'string' || op.path.trim() === '') {
        errors.push(`${prefix}: 缺少 path 字段或 path 为空`);
      }
    }

    // 各操作类型的特定字段校验
    switch (op.operation) {
      case 'ADDED': {
        const added = op as { content?: string };
        if (!added.content || typeof added.content !== 'string') {
          errors.push(`${prefix} (ADDED): 缺少 content 字段`);
        }
        break;
      }
      case 'MODIFIED': {
        const modified = op as { before?: string; after?: string };
        if (modified.before === undefined || typeof modified.before !== 'string' || modified.before === '') {
          errors.push(`${prefix} (MODIFIED): 缺少 before 字段`);
        }
        if (modified.after === undefined || typeof modified.after !== 'string' || modified.after === '') {
          errors.push(`${prefix} (MODIFIED): 缺少 after 字段`);
        }
        break;
      }
      case 'REMOVED': {
        const removed = op as { content?: string };
        if (!removed.content || typeof removed.content !== 'string') {
          errors.push(`${prefix} (REMOVED): 缺少 content 字段`);
        }
        break;
      }
      // RENAMED 已在上面处理
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 语义校验 — 检查 Delta 操作与基准 Spec 的一致性
 *
 * 校验规则：
 * - ADDED: 目标路径在基准 Spec 中不存在
 * - MODIFIED: 目标路径在基准 Spec 中存在
 * - REMOVED: 目标路径在基准 Spec 中存在
 * - RENAMED: oldPath 在基准中存在，newPath 在基准中不存在
 *
 * @param delta - 待校验的 Delta Spec
 * @param baseSpec - 基准 Spec 内容（文本形式）
 * @returns 校验结果，包含 valid 标志和 errors 列表
 */
export function validateDeltaSemantics(delta: DeltaSpec, baseSpec: string): ValidationResult {
  const errors: string[] = [];

  for (let i = 0; i < delta.operations.length; i++) {
    const op = delta.operations[i];
    const prefix = `operations[${i}]`;

    switch (op.operation) {
      case 'ADDED': {
        // ADDED: 目标路径在基准中不应存在
        if (baseSpec.includes(op.path)) {
          errors.push(`${prefix} (ADDED): 路径 "${op.path}" 在基准 Spec 中已存在`);
        }
        break;
      }
      case 'MODIFIED': {
        // MODIFIED: 目标路径在基准中必须存在
        if (!baseSpec.includes(op.path)) {
          errors.push(`${prefix} (MODIFIED): 路径 "${op.path}" 在基准 Spec 中不存在`);
        }
        break;
      }
      case 'REMOVED': {
        // REMOVED: 目标路径在基准中必须存在
        if (!baseSpec.includes(op.path)) {
          errors.push(`${prefix} (REMOVED): 路径 "${op.path}" 在基准 Spec 中不存在`);
        }
        break;
      }
      case 'RENAMED': {
        // RENAMED: oldPath 存在，newPath 不存在
        const renamed = op as { oldPath: string; newPath: string };
        if (!baseSpec.includes(renamed.oldPath)) {
          errors.push(`${prefix} (RENAMED): oldPath "${renamed.oldPath}" 在基准 Spec 中不存在`);
        }
        if (baseSpec.includes(renamed.newPath)) {
          errors.push(`${prefix} (RENAMED): newPath "${renamed.newPath}" 在基准 Spec 中已存在`);
        }
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
