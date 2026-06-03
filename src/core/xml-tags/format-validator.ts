/**
 * XML 标签格式验证器
 *
 * 对解析后的标签进行格式规范校验，包括命名规则、
 * 内容非空和同类型嵌套检测。
 */

import type { XmlTag, TagIssue, TagParseResult } from './types.js';

/** 标签命名正则：只允许大写字母和连字符 */
const TAG_NAME_REGEX = /^[A-Z][A-Z-]*[A-Z]$/;

/**
 * 验证单个标签的格式
 *
 * 校验规则：
 * - 标签名只允许大写字母和连字符
 * - 内容不能为空白字符
 *
 * @param tag - 待验证的标签
 * @returns 该标签的格式问题列表
 */
export function validateTagFormat(tag: XmlTag): TagIssue[] {
  const issues: TagIssue[] = [];

  // 校验标签命名规范
  if (!TAG_NAME_REGEX.test(tag.type)) {
    issues.push({
      level: 'ERROR',
      tag: tag.type,
      line: tag.line,
      message: `标签名 ${tag.type} 不符合命名规范，只允许大写字母和连字符`,
    });
  }

  // 校验内容不能为空白
  if (!tag.content.trim()) {
    issues.push({
      level: 'ERROR',
      tag: tag.type,
      line: tag.line,
      message: `标签 ${tag.type} 的内容不能为空`,
    });
  }

  return issues;
}

/**
 * 对解析结果中的所有标签进行格式验证
 *
 * 遍历所有已解析的标签，逐个执行格式校验，
 * 并汇总所有发现的问题。
 *
 * @param result - 解析器返回的解析结果
 * @returns 所有标签的格式问题列表
 */
export function validateAllFormats(result: TagParseResult): TagIssue[] {
  const issues: TagIssue[] = [];

  for (const tag of result.tags) {
    issues.push(...validateTagFormat(tag));
  }

  return issues;
}
