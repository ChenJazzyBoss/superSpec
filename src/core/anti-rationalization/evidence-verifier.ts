/**
 * 完成声明证据化验证器
 *
 * 验证 AI 的完成声明是否附带有效且新鲜的证据，
 * 拒绝无证据或过期证据的完成声明。
 */

import type { CompletionEvidence, VerifyResult, EvidenceType } from './types.js';

/** 合法的证据类型集合 */
const VALID_EVIDENCE_TYPES: Set<string> = new Set<EvidenceType>([
  'validation-output',
  'test-result',
  'file-diff',
  'command-output',
  'log',
]);

/**
 * 验证完成声明的证据
 *
 * 规则：
 * - evidence.content 不能为空
 * - evidence.type 必须是合法类型
 * - 如果 lastModified 存在且 evidence.timestamp < lastModified，发出 staleWarning
 * - accepted: true 当证据非空、类型合法且新鲜
 *
 * @param claim - 完成声明描述
 * @param evidence - 提交的证据
 * @param lastModified - 最后修改时间（ISO 8601），用于判断证据是否过期
 * @returns 验证结果
 */
export function verifyEvidence(
  claim: string,
  evidence: CompletionEvidence,
  lastModified?: string,
): VerifyResult {
  // 验证证据类型合法性
  if (!VALID_EVIDENCE_TYPES.has(evidence.type)) {
    return {
      accepted: false,
      reason: `非法证据类型 "${evidence.type}"，合法类型：${[...VALID_EVIDENCE_TYPES].join(', ')}`,
    };
  }

  // 验证证据内容非空
  if (!evidence.content || evidence.content.trim().length === 0) {
    return {
      accepted: false,
      reason: '证据内容不能为空：完成声明必须附带验证证据',
    };
  }

  // 验证时间戳格式
  const evidenceTime = new Date(evidence.timestamp);
  if (isNaN(evidenceTime.getTime())) {
    return {
      accepted: false,
      reason: `无效的时间戳格式：${evidence.timestamp}`,
    };
  }

  // 检查证据是否过期
  let staleWarning = false;
  if (lastModified) {
    const modifiedTime = new Date(lastModified);
    if (!isNaN(modifiedTime.getTime()) && evidenceTime < modifiedTime) {
      staleWarning = true;
      return {
        accepted: false,
        staleWarning: true,
        reason: `证据已过期：证据时间戳 ${evidence.timestamp} 早于最后修改时间 ${lastModified}，请重新执行并提供最新证据`,
      };
    }
  }

  return {
    accepted: true,
    staleWarning,
  };
}
