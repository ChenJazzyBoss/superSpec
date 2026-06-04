/**
 * spec-code 关联追踪
 *
 * 解析 spec 中的 <!-- source: path1, path2 --> 标记，
 * 检测关联源码文件的修改时间，提醒 spec 是否需要更新。
 */

import { existsSync, statSync } from 'fs';
import { resolve } from 'path';

/** 源码追踪结果 */
export interface SourceTrackingResult {
  level: 'INFO' | 'WARNING';
  path: string;
  message: string;
}

/** source 标记正则 */
const SOURCE_MARKER_RE = /<!--\s*source:\s*(.+?)\s*-->/;

/**
 * 从 spec 内容中提取关联的源码文件列表
 */
export function extractSourceFiles(content: string): string[] {
  const match = content.match(SOURCE_MARKER_RE);
  if (!match) return [];

  return match[1]
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
}

/**
 * 检查源码文件与 spec 的时间关系
 *
 * @param specPath - spec 文件路径
 * @param sourceFiles - 关联的源码文件列表（相对于项目根目录）
 * @param projectRoot - 项目根目录
 */
export function checkSourceSync(
  specPath: string,
  sourceFiles: string[],
  projectRoot: string
): SourceTrackingResult[] {
  const results: SourceTrackingResult[] = [];

  let specMtime: Date;
  try {
    specMtime = statSync(specPath).mtime;
  } catch {
    return results;
  }

  for (const sourceFile of sourceFiles) {
    const fullPath = resolve(projectRoot, sourceFile);

    if (!existsSync(fullPath)) {
      results.push({
        level: 'WARNING',
        path: sourceFile,
        message: `关联的源码文件 ${sourceFile} 不存在，spec 可能已过时`,
      });
      continue;
    }

    try {
      const sourceMtime = statSync(fullPath).mtime;
      if (sourceMtime > specMtime) {
        results.push({
          level: 'INFO',
          path: sourceFile,
          message: `源码 ${sourceFile} 比 spec 更新，spec 可能需要同步更新`,
        });
      }
    } catch {
      // 无法读取文件时间，跳过
    }
  }

  return results;
}
