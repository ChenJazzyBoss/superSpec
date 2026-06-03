/**
 * Skill Guard 集成层
 *
 * 整合反合理化系统的所有组件，为每个技能提供统一的防护接口。
 * 在技能执行前、输出时和完成声明时进行全方位的反跳步检查。
 */

import type { RedFlag, CompletionEvidence, VerifyResult } from './types.js';
import { parseRedFlags } from './red-flag-loader.js';
import { detectRedFlag } from './red-flag-detector.js';
import { ChecklistEngine } from './checklist-enforcer.js';
import { verifyEvidence } from './evidence-verifier.js';
import { detectSkipPatterns } from './pattern-library.js';
import { parseXmlTags } from '../xml-tags/parser.js';
import { evaluateHardGate } from '../xml-tags/engines/hard-gate.js';
import { shouldSkipForSubagent } from '../xml-tags/engines/subagent-stop.js';
import type { TagParseResult } from '../xml-tags/types.js';

/**
 * Skill Guard 防护类
 *
 * 在技能执行的各个阶段提供反合理化检查：
 * - beforeExecute: 执行前检查红线表和 HARD-GATE
 * - onOutput: 输出时检测跳步模式和红线
 * - onCompletion: 完成声明时验证证据
 * - onSubagentDelegation: 子代理委托时检查 SUBAGENT-STOP
 */
export class SkillGuard {
  /** 技能文件原始内容 */
  private skillContent: string;
  /** 解析出的红线表条目 */
  private redFlags: RedFlag[];
  /** 检查清单引擎 */
  private checklist: ChecklistEngine;
  /** XML 标签解析结果 */
  private tags: TagParseResult;

  /**
   * 构造 Skill Guard
   *
   * 从技能文件内容中解析红线表、检查清单和 XML 标签，
   * 初始化各子系统的防护能力。
   *
   * @param skillContent - 技能文件（SKILL.md）的完整文本内容
   */
  constructor(skillContent: string) {
    this.skillContent = skillContent;
    this.redFlags = parseRedFlags(skillContent);
    this.checklist = new ChecklistEngine([]);
    this.tags = parseXmlTags(skillContent);
  }

  /**
   * 执行前检查
   *
   * 在技能开始执行前进行全方位检查：
   * - 检查红线表是否已配置（缺失则拒绝执行）
   * - 检查 HARD-GATE 标签的条件是否满足
   *
   * @returns 检查结果，包含是否允许执行和问题列表
   */
  beforeExecute(): { allowed: boolean; issues: string[] } {
    const issues: string[] = [];

    // 检查红线表是否配置
    if (this.redFlags.length === 0) {
      issues.push('技能配置缺少红线表，拒绝执行。请在技能文件中添加红线表。');
    }

    // 检查 HARD-GATE 标签
    const hardGateResult = evaluateHardGate(
      this.tags.tags,
      (content) => content.trim().length > 0,
    );

    if (!hardGateResult.allowed) {
      issues.push(hardGateResult.reason ?? 'HARD-GATE 阻断');
    }

    return {
      allowed: issues.length === 0,
      issues,
    };
  }

  /**
   * 输出检查
   *
   * 对技能执行过程中的输出进行实时检测：
   * - 检测是否匹配红线表中的跳步借口
   * - 检测是否触发反跳步模式库中的规则
   *
   * @param output - 技能执行过程中的输出文本
   * @returns 检测结果，包含匹配的红线（如有）和触发的跳步模式列表
   */
  onOutput(output: string): { redFlag?: RedFlag; patterns: string[] } {
    // 检测红线
    const redFlag = detectRedFlag(output, this.redFlags);

    // 检测跳步模式
    const matchedPatterns = detectSkipPatterns(output);
    const patternNames = matchedPatterns.map(p => p.name);

    return {
      redFlag: redFlag ?? undefined,
      patterns: patternNames,
    };
  }

  /**
   * 完成声明检查
   *
   * 验证 AI 的完成声明是否附带有效证据。
   * 无证据或过期证据的声明将被拒绝。
   *
   * @param claim - 完成声明描述
   * @param evidence - 提交的完成证据
   * @param lastModified - spec 最后修改时间（可选，用于过期检测）
   * @returns 验证结果
   */
  onCompletion(claim: string, evidence: CompletionEvidence, lastModified?: string): VerifyResult {
    return verifyEvidence(claim, evidence, lastModified);
  }

  /**
   * 子代理委托检查
   *
   * 检查当前技能是否包含 SUBAGENT-STOP 标签。
   * 若存在，子代理应跳过该技能的执行。
   *
   * @returns true 表示子代理应跳过，false 表示正常执行
   */
  onSubagentDelegation(): boolean {
    return shouldSkipForSubagent(this.tags.tags, true);
  }
}
