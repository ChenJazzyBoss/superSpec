import type { Spec, Requirement, Scenario } from '../spec-schema.js';

/**
 * 规则严重级别
 */
export type RuleLevel = 'ERROR' | 'WARNING' | 'INFO';

/**
 * 规则检查目标
 */
export type RuleTarget = 'spec' | 'requirement' | 'scenario';

/**
 * 规则上下文
 * 引擎根据 target 填充对应字段
 */
export interface RuleContext {
  spec: Spec;
  requirement?: Requirement;
  requirementIndex?: number;
  scenario?: Scenario;
  scenarioIndex?: number;
}

/**
 * 规则检查结果
 * 返回 null 表示通过
 */
export interface RuleResult {
  message: string;
  location?: string; // 如 "requirements[0].scenarios[1]"
}

/**
 * 规则定义
 */
export interface Rule {
  id: string; // 规则唯一标识，如 "no-vague-words"
  name: string; // 中文名称，如 "禁用模糊词"
  level: RuleLevel;
  target: RuleTarget;
  check: (ctx: RuleContext) => RuleResult | null;
}

/**
 * 规则违反记录
 */
export interface RuleViolation {
  rule: string; // 规则 id
  name: string; // 规则中文名
  level: RuleLevel;
  message: string;
  location?: string;
}

/**
 * 规则引擎运行结果
 */
export interface RuleEngineResult {
  violations: RuleViolation[];
  errors: RuleViolation[];
  warnings: RuleViolation[];
  infos: RuleViolation[];
  passed: boolean; // 无 ERROR 级别时为 true
}
