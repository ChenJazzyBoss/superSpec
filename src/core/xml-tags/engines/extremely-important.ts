import type { XmlTag } from '../types.js';

/**
 * 强化展示结果项
 */
export interface EmphasizedTag {
  /** 原始标签 */
  tag: XmlTag;
  /** 强调信息，用于提示 AI 这是不可协商的最高优先级指令 */
  emphasis: string;
}

/**
 * EXTREMELY-IMPORTANT 行为约束引擎
 * 提取所有 EXTREMELY-IMPORTANT 标签，返回需要强化展示的标签列表
 */
export function evaluateExtremelyImportant(tags: XmlTag[]): EmphasizedTag[] {
  return tags
    .filter(t => t.type === 'EXTREMELY-IMPORTANT')
    .map(tag => ({
      tag,
      emphasis: `[最高优先级] ${tag.content}`,
    }));
}
