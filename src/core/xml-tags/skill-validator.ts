/**
 * 技能文件 XML 标签校验器
 *
 * 组合解析器和格式验证器，对 SKILL.md 文件进行完整的 XML 标签校验。
 * 校验内容包括：
 * - XML 标签解析（跳过代码块）
 * - 标签格式规范校验
 * - 未知标签检测
 * - 未闭合标签检测
 */

import { readFileSync } from 'fs';
import { parseXmlTags } from './parser.js';
import { validateAllFormats } from './format-validator.js';
import type { SkillValidationResult, ValidationIssue, TagIssue } from './types.js';

/**
 * 将 TagIssue 转换为 ValidationIssue
 *
 * TagIssue 的 level 只有 'ERROR' | 'WARNING'，
 * ValidationIssue 额外支持 'INFO' 级别。
 *
 * @param issue - 原始标签问题
 * @returns 转换后的校验问题
 */
function toValidationIssue(issue: TagIssue): ValidationIssue {
  return {
    level: issue.level,
    tag: issue.tag,
    line: issue.line,
    message: issue.message,
  };
}

/**
 * 校验技能文件的 XML 标签
 *
 * 读取指定路径的文件内容，执行完整的 XML 标签校验流程：
 * 1. 解析文件中的 XML 标签（自动跳过代码块）
 * 2. 对解析到的标签进行格式规范校验
 * 3. 汇总所有问题，判断校验是否通过
 *
 * @param filePath - 技能文件的路径
 * @returns 校验结果，包含是否通过、标签数量和问题列表
 */
export function validateSkillFile(filePath: string): SkillValidationResult {
  const content = readFileSync(filePath, 'utf-8');
  return validateSkillContent(content);
}

/**
 * 从字符串内容校验 XML 标签
 *
 * 不读取文件，直接对传入的文本内容进行校验。
 * 适用于从内存中获取内容的场景（如编辑器实时校验）。
 *
 * @param content - 待校验的文本内容
 * @returns 校验结果，包含是否通过、标签数量和问题列表
 */
export function validateSkillContent(content: string): SkillValidationResult {
  // 第一步：解析 XML 标签
  const parseResult = parseXmlTags(content);

  // 第二步：对解析到的标签进行格式校验
  const formatIssues = validateAllFormats(parseResult);

  // 第三步：合并所有问题
  const allIssues: ValidationIssue[] = [
    ...parseResult.issues.map(toValidationIssue),
    ...formatIssues.map(toValidationIssue),
  ];

  // 第四步：判断校验是否通过（无 ERROR 级别问题）
  const hasErrors = allIssues.some(issue => issue.level === 'ERROR');

  return {
    valid: !hasErrors,
    tags: parseResult.tags.length,
    issues: allIssues,
  };
}
