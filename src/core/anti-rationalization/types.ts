/**
 * 反合理化系统类型定义
 *
 * 定义红线表、检查清单、跳步模式、证据化完成声明等核心类型。
 * 用于防止 AI 在执行技能时出现合理化跳步行为。
 */

/** 红线表条目 */
export interface RedFlag {
  /** AI 的借口 */
  excuse: string;
  /** 现实情况 */
  reality: string;
  /** 匹配模式（正则字符串） */
  pattern?: string;
}

/** 检查清单条目状态 */
export type ChecklistStatus = 'todo' | 'done';

/** 检查清单项 */
export interface ChecklistItem {
  /** 唯一标识 */
  id: number;
  /** 描述 */
  description: string;
  /** 完成标准 */
  criteria?: string;
  /** 状态 */
  status: ChecklistStatus;
  /** 完成证据 */
  evidence?: string;
}

/** 跳步模式 */
export interface SkipPattern {
  /** 唯一标识 */
  id: string;
  /** 模式名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 检测函数 */
  detector: (context: string) => boolean;
  /** 修复建议 */
  remediation: string;
}

/** 合法证据类型 */
export type EvidenceType = 'validation-output' | 'file-diff' | 'test-result' | 'command-output' | 'log';

/** 证据类型 */
export interface CompletionEvidence {
  /** 证据类型 */
  type: EvidenceType;
  /** 证据内容 */
  content: string;
  /** 时间戳 */
  timestamp: string;
  /** 相关文件列表（可选） */
  relatedFiles?: string[];
}

/** 证据验证结果 */
export interface VerifyResult {
  /** 是否接受 */
  accepted: boolean;
  /** 拒绝原因 */
  reason?: string;
  /** 是否存在过期警告 */
  staleWarning?: boolean;
}

/** 技能配置 */
export interface SkillConfig {
  /** 技能名称 */
  name: string;
  /** 技能描述 */
  description: string;
  /** 红线表 */
  redFlags: RedFlag[];
  /** 检查清单 */
  checklist: ChecklistItem[];
}

/** 阻止结果 */
export interface BlockResult {
  /** 是否被阻止 */
  blocked: boolean;
  /** 阻止原因 */
  reason?: string;
}

/** 进度信息 */
export interface ProgressInfo {
  /** 已完成数 */
  completed: number;
  /** 总数 */
  total: number;
  /** 当前条目序号 */
  current: number;
}
