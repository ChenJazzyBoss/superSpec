/**
 * 红线表加载器
 *
 * 从 SKILL.md 内容中解析红线表，提取跳步借口与现实情况的对照。
 * 红线表格式为 Markdown 表格：`| 跳步借口 | 现实 |`
 */

import type { RedFlag } from './types.js';

/**
 * 从 Markdown 内容中解析红线表
 *
 * 查找包含"跳步借口"和"现实"列头的 Markdown 表格，
 * 逐行提取 RedFlag 条目。跳过表头行和分隔行。
 *
 * @param content - SKILL.md 的文本内容
 * @returns 解析出的红线表条目数组，未找到表格时返回空数组
 */
export function parseRedFlags(content: string): RedFlag[] {
  const lines = content.split('\n');
  const redFlags: RedFlag[] = [];

  // 查找表头行：包含"跳步借口"和"现实"
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('跳步借口') && line.includes('现实')) {
      headerIndex = i;
      break;
    }
  }

  // 未找到红线表
  if (headerIndex === -1) {
    return redFlags;
  }

  // 从表头下一行开始解析数据行
  // 跳过分隔行（如 | --- | --- |）
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // 空行或非表格行则停止
    if (!line.startsWith('|')) {
      break;
    }

    // 跳过分隔行
    if (/^\|[\s-:|]+\|$/.test(line)) {
      continue;
    }

    // 解析表格单元格
    const cells = line
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);

    // 至少需要两列：借口和现实
    if (cells.length >= 2) {
      redFlags.push({
        excuse: cells[0],
        reality: cells[1],
      });
    }
  }

  return redFlags;
}
