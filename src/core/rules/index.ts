export type { Rule, RuleLevel, RuleTarget, RuleContext, RuleResult, RuleViolation, RuleEngineResult } from './types.js';
export { runRules } from './engine.js';

// 内置规则
export { requireShallRule } from './builtin/require-shall.js';
export { minScenariosRule } from './builtin/min-scenarios.js';
export { uniqueReqNamesRule } from './builtin/unique-req-names.js';
export { uniqueScenarioNamesRule } from './builtin/unique-scenario-names.js';
export { noVagueWordsRule } from './builtin/no-vague-words.js';
export { scenarioTypesRule } from './builtin/scenario-types.js';
export { overviewLengthRule } from './builtin/overview-length.js';
export { testabilityRule } from './builtin/testability.js';
export { recommendedScenariosRule } from './builtin/recommended-scenarios.js';
export { diagramPresenceRule } from './builtin/diagram-presence.js';
export { scenarioTypeClassifierRule } from './builtin/scenario-type-classifier.js';

import { requireShallRule } from './builtin/require-shall.js';
import { minScenariosRule } from './builtin/min-scenarios.js';
import { uniqueReqNamesRule } from './builtin/unique-req-names.js';
import { uniqueScenarioNamesRule } from './builtin/unique-scenario-names.js';
import { noVagueWordsRule } from './builtin/no-vague-words.js';
import { scenarioTypesRule } from './builtin/scenario-types.js';
import { overviewLengthRule } from './builtin/overview-length.js';
import { testabilityRule } from './builtin/testability.js';
import { recommendedScenariosRule } from './builtin/recommended-scenarios.js';
import { diagramPresenceRule } from './builtin/diagram-presence.js';
import { scenarioTypeClassifierRule } from './builtin/scenario-type-classifier.js';
import type { Rule } from './types.js';

/**
 * 默认内置规则集
 */
export const builtinRules: Rule[] = [
  // ERROR 级别 - 结构完整性
  requireShallRule,
  minScenariosRule,
  uniqueReqNamesRule,
  uniqueScenarioNamesRule,
  // WARNING 级别 - 质量检查
  recommendedScenariosRule,
  noVagueWordsRule,
  scenarioTypesRule,
  diagramPresenceRule,
  scenarioTypeClassifierRule,
  // INFO 级别 - 建议
  overviewLengthRule,
  testabilityRule,
];
