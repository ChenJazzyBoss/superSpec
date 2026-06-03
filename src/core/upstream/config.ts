/**
 * 上游对齐检测 — 配置加载与验证
 * @module upstream/config
 */

import { readFileSync, existsSync } from 'node:fs';
import type { UpstreamConfig, UpstreamSource } from './types.js';

/**
 * 加载上游配置文件
 * @param configPath - upstream.json 文件路径
 * @returns 解析后的配置对象
 * @throws 文件不存在或 JSON 解析失败时抛出错误
 */
export function loadUpstreamConfig(configPath: string): UpstreamConfig {
  if (!existsSync(configPath)) {
    throw new Error(`配置文件不存在: ${configPath}`);
  }

  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf-8');
  } catch {
    throw new Error(`无法读取配置文件: ${configPath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`配置文件 JSON 格式错误: ${configPath}`);
  }

  return parsed as UpstreamConfig;
}

/**
 * 校验上游配置结构合法性
 * @param config - 待校验的配置对象
 * @returns 校验结果，包含是否合法及错误列表
 */
export function validateUpstreamConfig(config: UpstreamConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['配置必须是一个对象'] };
  }

  if (!Array.isArray(config.sources)) {
    return { valid: false, errors: ['sources 必须是数组'] };
  }

  for (let i = 0; i < config.sources.length; i++) {
    const src = config.sources[i] as UpstreamSource;
    const prefix = `sources[${i}]`;

    if (!src.name || typeof src.name !== 'string') {
      errors.push(`${prefix}: name 必须是非空字符串`);
    }

    if (src.type !== 'git' && src.type !== 'http') {
      errors.push(`${prefix}: type 必须为 "git" 或 "http"`);
    }

    if (!src.url || typeof src.url !== 'string') {
      errors.push(`${prefix}: url 必须是非空字符串`);
    }

    if (!Array.isArray(src.paths) || src.paths.length === 0) {
      errors.push(`${prefix}: paths 必须是非空数组`);
    } else {
      for (let j = 0; j < src.paths.length; j++) {
        if (typeof src.paths[j] !== 'string' || src.paths[j] === '') {
          errors.push(`${prefix}: paths[${j}] 必须是非空字符串`);
        }
      }
    }

    if (src.branch !== undefined && typeof src.branch !== 'string') {
      errors.push(`${prefix}: branch 必须是字符串`);
    }
  }

  // 检查 name 唯一性
  const names = config.sources.map((s) => s.name);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  if (duplicates.length > 0) {
    errors.push(`存在重复的源名称: ${[...new Set(duplicates)].join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}
