/**
 * 配置合并引擎
 *
 * 实现三级配置的深度合并策略：
 * - 对象类型：深度合并（递归合并子属性）
 * - 数组类型：直接覆盖（高优先级完全替换低优先级）
 * - 基础类型：直接覆盖
 *
 * 优先级：CLI flag > 变更配置 > 项目配置 > 全局配置 > 内置默认值
 */

import type {
  GlobalConfig,
  ProjectConfig,
  ChangeConfig,
  ResolvedConfig,
} from './types.js';

/**
 * 判断值是否为纯对象（非数组、非 null）
 *
 * @param value - 待检测的值
 * @returns 是否为纯对象
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 深度合并两个配置对象
 *
 * 合并策略：
 * - 对象类型属性：递归深度合并
 * - 数组类型属性：source 的数组直接覆盖 target 的数组
 * - 基础类型属性：source 的值直接覆盖 target 的值
 *
 * @param target - 目标对象（低优先级）
 * @param source - 源对象（高优先级）
 * @returns 合并后的新对象，不修改原始对象
 */
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = result[key];

    if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
      // 对象类型：深度合并
      result[key] = deepMerge(targetVal, sourceVal);
    } else {
      // 数组和基础类型：直接覆盖
      result[key] = sourceVal;
    }
  }

  return result;
}

/**
 * 解析最终配置
 *
 * 按优先级合并四层配置：CLI flag > 变更配置 > 项目配置 > 全局配置。
 * 每层配置均为可选，缺失时跳过。
 *
 * @param global - 全局配置
 * @param project - 项目配置
 * @param change - 变更配置
 * @param cliFlags - CLI flag 配置
 * @returns 合并后的最终配置，包含各层来源路径
 */
export function resolveConfig(
  global?: GlobalConfig | null,
  project?: ProjectConfig | null,
  change?: ChangeConfig | null,
  cliFlags?: Record<string, unknown> | null
): ResolvedConfig {
  let merged: Record<string, unknown> = {};
  const sources: ResolvedConfig['_sources'] = {};

  // 第一层：全局配置
  if (global) {
    merged = deepMerge(merged, global as Record<string, unknown>);
    sources.global = 'global';
  }

  // 第二层：项目配置（覆盖全局）
  if (project) {
    merged = deepMerge(merged, project as Record<string, unknown>);
    sources.project = 'project';
  }

  // 第三层：变更配置（覆盖项目）
  if (change) {
    merged = deepMerge(merged, change as Record<string, unknown>);
    sources.change = 'change';
  }

  // 第四层：CLI flag（覆盖一切）
  if (cliFlags) {
    merged = deepMerge(merged, cliFlags);
  }

  return {
    ...merged,
    _sources: sources,
  } as ResolvedConfig;
}
