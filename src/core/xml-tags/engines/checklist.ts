import type { XmlTag, BehaviorEvaluation } from '../types.js';

/**
 * 从 CHECKLIST 标签内容中解析检查项
 * 支持 `- [ ]` 和 `- [x]` 格式，每行一个检查项
 *
 * @param content - CHECKLIST 标签的文本内容
 * @returns 解析出的检查项列表（纯文本，不含前缀标记）
 */
export function parseChecklistItems(content: string): string[] {
  const lines = content.split('\n');
  const items: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^-\s*\[[ x]\]\s*(.+)$/);
    if (match) {
      items.push(match[1].trim());
    }
  }
  return items;
}

/**
 * CHECKLIST 行为约束引擎
 * 解析 CHECKLIST 标签内容为检查项列表，对比已完成项
 * 未全部完成时返回阻断结果及剩余未完成项
 *
 * @param tags - 已解析的标签列表
 * @param completedItems - 已完成的检查项集合
 * @returns 行为评估结果
 */
export function evaluateChecklist(
  tags: XmlTag[],
  completedItems: Set<string>,
): BehaviorEvaluation {
  const checklists = tags.filter(t => t.type === 'CHECKLIST');
  if (checklists.length === 0) {
    return { allowed: true };
  }

  const allItems: string[] = [];
  for (const checklist of checklists) {
    allItems.push(...parseChecklistItems(checklist.content));
  }

  if (allItems.length === 0) {
    return { allowed: true };
  }

  const remaining = allItems.filter(item => !completedItems.has(item));
  if (remaining.length === 0) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `CHECKLIST 未全部完成，剩余 ${remaining.length} 项`,
    blockingTag: 'CHECKLIST',
    remainingItems: remaining,
  };
}
