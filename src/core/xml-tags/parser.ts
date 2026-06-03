/**
 * XML 标签解析器
 *
 * 从 SKILL.md 内容中解析 XML 标签，支持代码块过滤、
 * 未闭合标签检测和同类型嵌套检测。
 */

import { KNOWN_TAGS, type TagType, type XmlTag, type TagIssue, type TagParseResult } from './types.js';

/**
 * 查找内容中所有 Markdown 代码块的范围
 *
 * @param content - 原始文本内容
 * @returns 代码块的 [start, end] 位置数组
 */
function findCodeBlockRanges(content: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const regex = /```/g;
  let start: number | null = null;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (start === null) {
      start = match.index;
    } else {
      ranges.push([start, match.index + match[0].length]);
      start = null;
    }
  }

  // 未闭合的代码块延伸到文件末尾
  if (start !== null) {
    ranges.push([start, content.length]);
  }

  return ranges;
}

/**
 * 判断某个位置是否在代码块内
 *
 * @param index - 字符位置
 * @param ranges - 代码块范围数组
 * @returns 是否在代码块内
 */
function isInCodeBlock(index: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([start, end]) => index >= start && index < end);
}

/**
 * 根据字符位置计算行号
 *
 * @param content - 原始文本内容
 * @param index - 字符位置
 * @returns 行号（从 1 开始）
 */
function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

/**
 * 转义正则表达式中的特殊字符
 *
 * @param str - 需要转义的字符串
 * @returns 转义后的字符串
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 解析文本内容中的 XML 标签
 *
 * 使用正则表达式匹配闭合标签，自动跳过代码块内的标签，
 * 检测未知标签类型、空内容和未闭合标签。
 *
 * @param content - 待解析的文本内容
 * @returns 解析结果，包含标签列表和问题列表
 */
export function parseXmlTags(content: string): TagParseResult {
  const tags: XmlTag[] = [];
  const issues: TagIssue[] = [];

  if (!content.trim()) {
    return { tags, issues };
  }

  const codeBlockRanges = findCodeBlockRanges(content);

  // 用于记录闭合标签的起始位置，便于后续检测未闭合标签
  const closedTagStarts = new Set<number>();

  // 匹配闭合标签: <TAG-NAME>content</TAG-NAME>
  const tagRegex = /<([A-Z][A-Z-]*[A-Z])>([\s\S]*?)<\/\1>/g;
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    const matchStart = match.index;

    // 跳过代码块内的标签
    if (isInCodeBlock(matchStart, codeBlockRanges)) {
      continue;
    }

    closedTagStarts.add(matchStart);

    const tagName = match[1];
    const tagContent = match[2];
    const lineNumber = getLineNumber(content, matchStart);
    const raw = match[0];

    // 检查是否为已知标签
    if (!KNOWN_TAGS.has(tagName)) {
      issues.push({
        level: 'WARNING',
        tag: tagName,
        line: lineNumber,
        message: `未定义的标签类型: ${tagName}`,
      });
    }

    // 检查内容是否为空（纯空白）
    if (!tagContent.trim()) {
      issues.push({
        level: 'ERROR',
        tag: tagName,
        line: lineNumber,
        message: `标签 ${tagName} 的内容不能为空`,
      });
    }

    // 检测同类型嵌套标签：内容中是否包含同类型的开标签
    const innerOpenRegex = new RegExp(`<${escapeRegex(tagName)}>`, 'g');
    if (innerOpenRegex.test(tagContent)) {
      issues.push({
        level: 'ERROR',
        tag: tagName,
        line: lineNumber,
        message: `标签 ${tagName} 不得嵌套相同类型的标签`,
      });
    }

    tags.push({
      type: tagName as TagType,
      content: tagContent,
      line: lineNumber,
      raw,
    });
  }

  // 检测未闭合标签：查找所有开标签，排除已在闭合标签中匹配过的
  const unclosedRegex = /<([A-Z][A-Z-]*[A-Z])>/g;
  let unclosedMatch;

  while ((unclosedMatch = unclosedRegex.exec(content)) !== null) {
    const pos = unclosedMatch.index;

    // 跳过代码块内的标签
    if (isInCodeBlock(pos, codeBlockRanges)) {
      continue;
    }

    // 跳过已被闭合标签匹配的开标签
    if (closedTagStarts.has(pos)) {
      continue;
    }

    const tagName = unclosedMatch[1];
    const lineNumber = getLineNumber(content, pos);

    issues.push({
      level: 'ERROR',
      tag: tagName,
      line: lineNumber,
      message: `标签 ${tagName} 缺少闭合标签`,
    });
  }

  return { tags, issues };
}
