import type { XmlTag, BehaviorEvaluation } from '../types.js';

/**
 * HARD-GATE 行为约束引擎
 * 条件不满足时阻断执行，不允许任何绕过方式
 */
export function evaluateHardGate(
  tags: XmlTag[],
  condition: (content: string) => boolean,
): BehaviorEvaluation {
  const hardGates = tags.filter(t => t.type === 'HARD-GATE');
  for (const gate of hardGates) {
    if (!condition(gate.content)) {
      return {
        allowed: false,
        reason: `HARD-GATE 阻断: ${gate.content}`,
        blockingTag: 'HARD-GATE',
      };
    }
  }
  return { allowed: true };
}
