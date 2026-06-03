/**
 * 红线检测器
 *
 * 将用户输入与红线表中的借口进行模糊匹配，
 * 检测 AI 是否在使用已知的跳步借口。
 */

import type { RedFlag } from './types.js';

/**
 * 检测输入是否匹配红线表中的某个借口
 *
 * 对每个 RedFlag 的 excuse 进行关键词匹配（包含即匹配）。
 * 如果 RedFlag 定义了 pattern，则使用正则匹配。
 * 返回第一个匹配的 RedFlag，无匹配返回 null。
 *
 * @param input - 待检测的文本输入
 * @param redFlags - 红线表条目数组
 * @returns 匹配到的红线条目，无匹配返回 null
 */
export function detectRedFlag(input: string, redFlags: RedFlag[]): RedFlag | null {
  if (!input || redFlags.length === 0) {
    return null;
  }

  const normalizedInput = input.toLowerCase();

  for (const flag of redFlags) {
    // 优先使用正则 pattern 匹配
    if (flag.pattern) {
      try {
        const regex = new RegExp(flag.pattern, 'i');
        if (regex.test(input)) {
          return flag;
        }
      } catch {
        // 止则表达式无效时降级为关键词匹配
      }
    }

    // 关键词匹配：借口文本出现在输入中即视为匹配
    const normalizedExcuse = flag.excuse.toLowerCase();
    if (normalizedInput.includes(normalizedExcuse)) {
      return flag;
    }
  }

  return null;
}
