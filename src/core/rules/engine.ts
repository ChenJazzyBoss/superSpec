import type { Spec } from '../spec-schema.js';
import type { Rule, RuleViolation, RuleEngineResult } from './types.js';

/**
 * 执行规则引擎
 * 遍历所有规则，对 Spec 进行检查
 */
export function runRules(spec: Spec, rules: Rule[]): RuleEngineResult {
  const violations: RuleViolation[] = [];

  for (const rule of rules) {
    if (rule.target === 'spec') {
      const result = rule.check({ spec });
      if (result) {
        violations.push({
          rule: rule.id,
          name: rule.name,
          level: rule.level,
          message: result.message,
          location: result.location,
        });
      }
    }

    if (rule.target === 'requirement') {
      for (const [ri, req] of spec.requirements.entries()) {
        const result = rule.check({
          spec,
          requirement: req,
          requirementIndex: ri,
        });
        if (result) {
          violations.push({
            rule: rule.id,
            name: rule.name,
            level: rule.level,
            message: result.message,
            location: result.location ?? `requirements[${ri}]`,
          });
        }
      }
    }

    if (rule.target === 'scenario') {
      for (const [ri, req] of spec.requirements.entries()) {
        for (const [si, scenario] of req.scenarios.entries()) {
          const result = rule.check({
            spec,
            requirement: req,
            requirementIndex: ri,
            scenario,
            scenarioIndex: si,
          });
          if (result) {
            violations.push({
              rule: rule.id,
              name: rule.name,
              level: rule.level,
              message: result.message,
              location: result.location ?? `requirements[${ri}].scenarios[${si}]`,
            });
          }
        }
      }
    }
  }

  const errors = violations.filter((v) => v.level === 'ERROR');
  const warnings = violations.filter((v) => v.level === 'WARNING');
  const infos = violations.filter((v) => v.level === 'INFO');

  return { violations, errors, warnings, infos, passed: errors.length === 0 };
}
