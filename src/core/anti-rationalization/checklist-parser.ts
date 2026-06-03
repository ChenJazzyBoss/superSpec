/**
 * 检查清单解析器
 *
 * 从 Markdown 内容中解析 `- [ ]` / `- [x]` 格式的检查清单条目，
 * 为每个条目分配序号 id 并标记状态。
 */

import type { ChecklistItem, ChecklistStatus } from './types.js';

/**
 * 从 Markdown 内容中解析检查清单
 *
 * 解析规则：
 * - 格式：`- [ ] 描述` 或 `- [x] 描述`
 * - `[ ]` -> status: 'todo'
 * - `[x]` -> status: 'done'
 * - 每个条目自动生成 id（从 1 开始的序号）
 * - description = 整行文本（含前缀标记）
 *
 * @param content - Markdown 文本内容
 * @returns 解析出的检查清单条目列表
 */
export function parseChecklist(content: string): ChecklistItem[] {
  if (!content || content.trim().length === 0) {
    return [];
  }

  const items: ChecklistItem[] = [];
  const lines = content.split('\n');
  let id = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^-\s*\[([ x])\]\s+(.+)$/);
    if (match) {
      id++;
      const status: ChecklistStatus = match[1] === 'x' ? 'done' : 'todo';
      items.push({
        id,
        description: trimmed,
        status,
      });
    }
  }

  return items;
}
