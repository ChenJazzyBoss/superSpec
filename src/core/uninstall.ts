/**
 * superSpec 卸载模块
 *
 * 移除 superSpec 生成的所有文件：
 * - .superspec/ 目录
 * - CLAUDE.md 中的哨兵内容
 * - .claude/ 中 superspec 相关的 skills 和 hooks
 */

import { existsSync, rmSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

/** 哨兵标记 */
const SENTINEL_BEGIN = '<!-- superspec:begin -->';
const SENTINEL_END = '<!-- superspec:end -->';

/** superspec 相关的 skill 目录名前缀 */
const SUPERSPEC_SKILL_PREFIX = 'superspec:';

/** superspec 相关的 hooks 配置 */
const SUPERSPEC_HOOKS = ['hooks.json', 'session-start'];

/** 卸载结果 */
export interface UninstallResult {
  removed: string[];
  skipped: string[];
}

/**
 * 移除 CLAUDE.md 中的哨兵内容
 */
function removeSentinelContent(claudeMdPath: string): boolean {
  if (!existsSync(claudeMdPath)) return false;

  const content = readFileSync(claudeMdPath, 'utf-8');
  const beginIdx = content.indexOf(SENTINEL_BEGIN);
  const endIdx = content.indexOf(SENTINEL_END);

  if (beginIdx === -1 || endIdx === -1) return false;

  const before = content.slice(0, beginIdx).trimEnd();
  const after = content.slice(endIdx + SENTINEL_END.length).trimStart();
  const newContent = before ? `${before}\n${after}`.trim() : after.trim();

  writeFileSync(claudeMdPath, newContent, 'utf-8');
  return true;
}

/**
 * 移除 .claude/ 中 superspec 相关的 skills 和 hooks
 */
function removeClaudeConfig(projectRoot: string): string[] {
  const removed: string[] = [];
  const claudeDir = join(projectRoot, '.claude');

  if (!existsSync(claudeDir)) return removed;

  // 移除 superspec skills
  const skillsDir = join(claudeDir, 'skills');
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith(SUPERSPEC_SKILL_PREFIX)) {
        rmSync(join(skillsDir, entry.name), { recursive: true });
        removed.push(`.claude/skills/${entry.name}`);
      }
    }
  }

  // 移除 superspec hooks
  const hooksDir = join(claudeDir, 'hooks');
  if (existsSync(hooksDir)) {
    for (const hook of SUPERSPEC_HOOKS) {
      const hookPath = join(hooksDir, hook);
      if (existsSync(hookPath)) {
        rmSync(hookPath, { recursive: true });
        removed.push(`.claude/hooks/${hook}`);
      }
    }
    // 如果 hooks 目录为空，移除它
    try {
      if (readdirSync(hooksDir).length === 0) {
        rmSync(hooksDir, { recursive: true });
      }
    } catch { /* ignore */ }
  }

  // 如果 .claude 目录为空，提示但不删除（可能是用户的其他配置）
  try {
    if (existsSync(claudeDir) && readdirSync(claudeDir).length === 0) {
      rmSync(claudeDir, { recursive: true });
      removed.push('.claude/');
    }
  } catch { /* ignore */ }

  return removed;
}

/**
 * 执行卸载
 */
export function uninstallProject(projectRoot: string): UninstallResult {
  const removed: string[] = [];
  const skipped: string[] = [];

  // 1. 移除 .superspec 目录
  const superspecDir = join(projectRoot, '.superspec');
  if (existsSync(superspecDir)) {
    rmSync(superspecDir, { recursive: true });
    removed.push('.superspec/');
  } else {
    skipped.push('.superspec/（不存在）');
  }

  // 2. 移除 CLAUDE.md 哨兵内容
  const claudeMdPath = join(projectRoot, 'CLAUDE.md');
  if (existsSync(claudeMdPath)) {
    const cleaned = removeSentinelContent(claudeMdPath);
    if (cleaned) {
      removed.push('CLAUDE.md（哨兵内容已移除）');
    } else {
      skipped.push('CLAUDE.md（无哨兵内容）');
    }
  } else {
    skipped.push('CLAUDE.md（不存在）');
  }

  // 3. 移除 .claude/ 中 superspec 相关文件
  const claudeRemoved = removeClaudeConfig(projectRoot);
  removed.push(...claudeRemoved);

  return { removed, skipped };
}

/**
 * 获取将要删除的文件列表（用于确认提示）
 */
export function getUninstallPreview(projectRoot: string): string[] {
  const preview: string[] = [];

  const superspecDir = join(projectRoot, '.superspec');
  if (existsSync(superspecDir)) {
    preview.push('.superspec/（整个目录）');
  }

  const claudeMdPath = join(projectRoot, 'CLAUDE.md');
  if (existsSync(claudeMdPath)) {
    const content = readFileSync(claudeMdPath, 'utf-8');
    if (content.includes(SENTINEL_BEGIN)) {
      preview.push('CLAUDE.md（哨兵内容）');
    }
  }

  const claudeDir = join(projectRoot, '.claude');
  if (existsSync(claudeDir)) {
    const skillsDir = join(claudeDir, 'skills');
    if (existsSync(skillsDir)) {
      for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name.startsWith(SUPERSPEC_SKILL_PREFIX)) {
          preview.push(`.claude/skills/${entry.name}`);
        }
      }
    }
    const hooksDir = join(claudeDir, 'hooks');
    if (existsSync(hooksDir)) {
      for (const hook of SUPERSPEC_HOOKS) {
        if (existsSync(join(hooksDir, hook))) {
          preview.push(`.claude/hooks/${hook}`);
        }
      }
    }
  }

  return preview;
}
