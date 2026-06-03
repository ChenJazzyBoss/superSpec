/**
 * XML 标签系统的类型定义
 *
 * 定义 superSpec 标签约束系统所用的类型、常量和接口。
 * 支持 HARD-GATE、EXTREMELY-IMPORTANT、SUBAGENT-STOP、CHECKLIST 四种标准标签。
 */

/** 标签类型枚举 */
export type TagType = 'HARD-GATE' | 'EXTREMELY-IMPORTANT' | 'SUBAGENT-STOP' | 'CHECKLIST';

/** 已知标签集合 */
export const KNOWN_TAGS: Set<string> = new Set([
  'HARD-GATE',
  'EXTREMELY-IMPORTANT',
  'SUBAGENT-STOP',
  'CHECKLIST',
]);

/** 标签优先级（数字越小优先级越高） */
export const TAG_PRIORITY: Record<TagType, number> = {
  'HARD-GATE': 1,
  'CHECKLIST': 2,
  'EXTREMELY-IMPORTANT': 3,
  'SUBAGENT-STOP': 4,
};

/** 解析后的标签 */
export interface XmlTag {
  /** 标签类型 */
  type: TagType;
  /** 标签内容 */
  content: string;
  /** 标签起始行号 */
  line: number;
  /** 原始匹配文本 */
  raw: string;
}

/** 标签问题 */
export interface TagIssue {
  /** 问题级别：ERROR 或 WARNING */
  level: 'ERROR' | 'WARNING';
  /** 涉及的标签名称 */
  tag?: string;
  /** 问题所在行号 */
  line: number;
  /** 问题描述 */
  message: string;
}

/** 解析结果 */
export interface TagParseResult {
  /** 解析到的标签列表 */
  tags: XmlTag[];
  /** 发现的问题列表 */
  issues: TagIssue[];
}

/** 行为评估结果 */
export interface BehaviorEvaluation {
  /** 是否允许继续操作 */
  allowed: boolean;
  /** 阻止原因 */
  reason?: string;
  /** 阻止操作的标签类型 */
  blockingTag?: TagType;
  /** 剩余未完成的检查项（CHECKLIST 专用） */
  remainingItems?: string[];
}

// --- 以下为 skill-validator 所需的扩展类型 ---

/** 校验问题的严重级别 */
export type IssueLevel = 'ERROR' | 'WARNING' | 'INFO';

/** 校验问题条目（扩展版，支持 INFO 级别） */
export interface ValidationIssue {
  /** 严重级别 */
  level: IssueLevel;
  /** 相关标签名称 */
  tag?: string;
  /** 问题所在行号 */
  line: number;
  /** 问题描述 */
  message: string;
}

/** 标签解析结果（扩展版） */
export interface ParseResult {
  /** 解析到的标签列表 */
  tags: XmlTag[];
  /** 解析过程中发现的问题 */
  issues: ValidationIssue[];
}

/** 技能文件校验结果 */
export interface SkillValidationResult {
  /** 是否通过校验（无 ERROR 级别问题） */
  valid: boolean;
  /** 解析到的标签数量 */
  tags: number;
  /** 所有校验问题 */
  issues: ValidationIssue[];
}
