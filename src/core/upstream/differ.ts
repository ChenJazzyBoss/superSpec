/**
 * 上游对齐检测 — 差异比较
 * @module upstream/differ
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { UpstreamConfig, UpstreamReport, DiffEntry } from './types.js';

/**
 * 比较两个文件内容，返回是否变更及差异描述
 * @param local - 本地文件路径
 * @param upstream - 上游文件路径
 * @returns 比较结果：是否变更及差异描述数组
 */
export function compareFiles(
  local: string,
  upstream: string
): { changed: boolean; diffs: string[] } {
  const localExists = existsSync(local);
  const upstreamExists = existsSync(upstream);

  // 双方都不存在
  if (!localExists && !upstreamExists) {
    return { changed: false, diffs: [] };
  }

  // 仅上游存在 → 新增
  if (!localExists && upstreamExists) {
    return { changed: true, diffs: ['上游新增文件，本地不存在'] };
  }

  // 仅本地存在 → 上游已删除
  if (localExists && !upstreamExists) {
    return { changed: true, diffs: ['本地文件在上游已不存在'] };
  }

  // 双方存在，比较内容
  let localContent: string;
  let upstreamContent: string;
  try {
    localContent = readFileSync(local, 'utf-8');
    upstreamContent = readFileSync(upstream, 'utf-8');
  } catch {
    return { changed: true, diffs: ['无法读取文件内容进行比较'] };
  }

  if (localContent === upstreamContent) {
    return { changed: false, diffs: [] };
  }

  // 逐行比较，找出差异行
  const localLines = localContent.split('\n');
  const upstreamLines = upstreamContent.split('\n');
  const diffs: string[] = [];

  const maxLen = Math.max(localLines.length, upstreamLines.length);
  for (let i = 0; i < maxLen; i++) {
    const lLine = i < localLines.length ? localLines[i] : undefined;
    const uLine = i < upstreamLines.length ? upstreamLines[i] : undefined;
    if (lLine !== uLine) {
      diffs.push(`第 ${i + 1} 行: 本地="${lLine ?? '<EOF>'}" vs 上游="${uLine ?? '<EOF>'}"`);
    }
  }

  return { changed: true, diffs };
}

/**
 * 递归收集目录下的所有文件路径
 * @param dir - 目录路径
 * @param prefix - 路径前缀（用于相对路径）
 * @returns 文件相对路径列表
 */
function collectFiles(dir: string, prefix: string = ''): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, relPath));
    } else if (entry.isFile()) {
      files.push(relPath);
    }
  }
  return files;
}

/**
 * 根据文件路径推断差异类别
 * @param filePath - 文件相对路径
 * @returns 差异类别
 */
function inferCategory(filePath: string): DiffEntry['category'] {
  const lower = filePath.toLowerCase();
  if (lower.includes('hook') || lower.endsWith('.sh') || lower.endsWith('.bash')) {
    return 'hook-script';
  }
  if (lower.includes('frontmatter') || lower.includes('template') || lower.endsWith('.yaml') || lower.endsWith('.yml')) {
    return 'skill-frontmatter';
  }
  return 'validation-rule';
}

/**
 * 基于本地目录和上游缓存目录执行差异检测
 * @param config - 上游配置
 * @param localDir - 本地文件目录（与上游 paths 对应的本地根目录）
 * @param upstreamCacheDir - 上游缓存目录路径（可选，默认通过 config 推断）
 * @returns 每个上游源的差异报告列表
 */
export function detectDrift(
  config: UpstreamConfig,
  localDir: string,
  upstreamCacheDir?: string
): UpstreamReport[] {
  const reports: UpstreamReport[] = [];

  for (const source of config.sources) {
    const diffs: DiffEntry[] = [];
    const baseCacheDir = upstreamCacheDir ?? `.upstream-cache/${source.name}`;

    for (const filePath of source.paths) {
      const localPath = join(localDir, filePath);
      const upstreamPath = join(baseCacheDir, filePath);

      const result = compareFiles(localPath, upstreamPath);

      if (!result.changed) continue;

      // 确定差异类型
      let diffType: DiffEntry['type'];
      if (!existsSync(localPath) && existsSync(upstreamPath)) {
        diffType = 'added';
      } else if (existsSync(localPath) && !existsSync(upstreamPath)) {
        diffType = 'removed';
      } else {
        diffType = 'modified';
      }

      diffs.push({
        path: filePath,
        type: diffType,
        category: inferCategory(filePath),
        severity: 'needs-review',
        detail: result.diffs.join('\n'),
      });
    }

    // 额外扫描上游缓存目录中的所有文件，检测本地不存在的新增文件
    if (existsSync(baseCacheDir)) {
      const allUpstreamFiles = collectFiles(baseCacheDir);
      for (const uf of allUpstreamFiles) {
        if (source.paths.includes(uf)) continue; // 已处理
        const localPath = join(localDir, uf);
        if (!existsSync(localPath)) {
          diffs.push({
            path: uf,
            type: 'added',
            category: inferCategory(uf),
            severity: 'needs-review',
            detail: '上游新增文件，本地不存在',
          });
        }
      }
    }

    const needsSync = diffs.filter((d) => d.severity === 'needs-sync').length;
    const intentional = diffs.filter((d) => d.severity === 'intentional-divergence').length;
    const needsReview = diffs.filter((d) => d.severity === 'needs-review').length;

    reports.push({
      source: source.name,
      timestamp: new Date().toISOString(),
      diffs,
      summary: {
        total: diffs.length,
        needsSync,
        intentional,
        needsReview,
      },
    });
  }

  return reports;
}
