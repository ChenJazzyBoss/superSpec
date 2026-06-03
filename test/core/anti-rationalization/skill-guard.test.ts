import { describe, it, expect } from 'vitest';
import { SkillGuard } from '../../../src/core/anti-rationalization/skill-guard.js';
import { detectSkipPatterns, getBuiltinPatterns } from '../../../src/core/anti-rationalization/pattern-library.js';
import type { CompletionEvidence } from '../../../src/core/anti-rationalization/types.js';

/** 构造测试用技能内容（含红线表和 HARD-GATE 标签） */
function makeSkillContent(options?: {
  withRedFlags?: boolean;
  withHardGate?: boolean;
  withSubagentStop?: boolean;
}): string {
  const opts = options ?? {};
  const parts: string[] = ['# 测试技能\n'];

  if (opts.withRedFlags !== false) {
    parts.push(`## 红线表

| 跳步借口 | 现实 |
| --- | --- |
| 不需要写 spec | 没有 spec 就无法保证质量 |
| 我已经验证过了 | 必须提供校验输出证据 |
`);
  }

  if (opts.withHardGate) {
    parts.push(`<HARD-GATE>spec 校验必须通过</HARD-GATE>
`);
  }

  if (opts.withSubagentStop) {
    parts.push(`<SUBAGENT-STOP>子代理不得执行此技能</SUBAGENT-STOP>
`);
  }

  return parts.join('\n');
}

/** 构造测试用证据 */
function makeEvidence(overrides?: Partial<CompletionEvidence>): CompletionEvidence {
  return {
    type: 'validation-output',
    content: 'valid: true\n所有规则通过',
    timestamp: new Date().toISOString(),
    relatedFiles: ['spec.md'],
    ...overrides,
  };
}

describe('SkillGuard', () => {
  describe('beforeExecute', () => {
    it('正常通过 — 有红线表且无 HARD-GATE 阻断', () => {
      const guard = new SkillGuard(makeSkillContent());
      const result = guard.beforeExecute();
      expect(result.allowed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('检测到红线表缺失时拒绝执行', () => {
      const guard = new SkillGuard(makeSkillContent({ withRedFlags: false }));
      const result = guard.beforeExecute();
      expect(result.allowed).toBe(false);
      expect(result.issues.some(i => i.includes('红线表'))).toBe(true);
    });

    it('HARD-GATE 标签存在时正常通过（条件满足）', () => {
      const guard = new SkillGuard(makeSkillContent({ withHardGate: true }));
      const result = guard.beforeExecute();
      // HARD-GATE 条件检查使用 content 非空即满足
      expect(result.allowed).toBe(true);
    });
  });

  describe('onOutput', () => {
    it('输出正常时无红线匹配', () => {
      const guard = new SkillGuard(makeSkillContent());
      const result = guard.onOutput('正在执行校验，结果如下...');
      expect(result.redFlag).toBeUndefined();
      expect(result.patterns).toHaveLength(0);
    });

    it('匹配跳步模式 — 无 spec 编码', () => {
      const guard = new SkillGuard(makeSkillContent());
      const result = guard.onOutput('我要直接写代码');
      expect(result.patterns).toContain('无 spec 编码');
    });

    it('匹配跳步模式 — 跳过校验', () => {
      const guard = new SkillGuard(makeSkillContent());
      const result = guard.onOutput('任务完成');
      expect(result.patterns).toContain('跳过校验');
    });

    it('匹配红线表中的借口', () => {
      const guard = new SkillGuard(makeSkillContent());
      const result = guard.onOutput('不需要写 spec，我直接开始');
      expect(result.redFlag).toBeDefined();
      expect(result.redFlag!.excuse).toContain('不需要写 spec');
    });
  });

  describe('onCompletion', () => {
    it('有效证据被接受', () => {
      const guard = new SkillGuard(makeSkillContent());
      const evidence = makeEvidence();
      const result = guard.onCompletion('校验通过', evidence);
      expect(result.accepted).toBe(true);
    });

    it('空证据被拒绝', () => {
      const guard = new SkillGuard(makeSkillContent());
      const evidence = makeEvidence({ content: '' });
      const result = guard.onCompletion('任务完成', evidence);
      expect(result.accepted).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('过期证据被拒绝', () => {
      const guard = new SkillGuard(makeSkillContent());
      const evidence = makeEvidence({ timestamp: '2020-01-01T00:00:00Z' });
      const result = guard.onCompletion('校验通过', evidence, '2025-01-01T00:00:00Z');
      expect(result.accepted).toBe(false);
      expect(result.staleWarning).toBe(true);
    });
  });

  describe('onSubagentDelegation', () => {
    it('有 SUBAGENT-STOP 标签时返回 true（应跳过）', () => {
      const guard = new SkillGuard(makeSkillContent({ withSubagentStop: true }));
      expect(guard.onSubagentDelegation()).toBe(true);
    });

    it('无 SUBAGENT-STOP 标签时返回 false', () => {
      const guard = new SkillGuard(makeSkillContent());
      expect(guard.onSubagentDelegation()).toBe(false);
    });
  });
});

describe('模式库', () => {
  it('内置模式可加载', () => {
    const patterns = getBuiltinPatterns();
    expect(patterns.length).toBeGreaterThanOrEqual(3);
    expect(patterns.some(p => p.id === 'no-spec-coding')).toBe(true);
    expect(patterns.some(p => p.id === 'skip-validation')).toBe(true);
    expect(patterns.some(p => p.id === 'selective-reporting')).toBe(true);
  });

  it('检测到跳步模式', () => {
    const patterns = detectSkipPatterns('我要直接写代码');
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].id).toBe('no-spec-coding');
    expect(patterns[0].remediation).toContain('spec');
  });

  it('无匹配返回空', () => {
    const patterns = detectSkipPatterns('正在运行校验，valid: true，所有规则通过，失败项无');
    expect(patterns).toHaveLength(0);
  });

  it('空上下文返回空', () => {
    const patterns = detectSkipPatterns('');
    expect(patterns).toHaveLength(0);
  });

  it('自定义模式可传入', () => {
    const custom = [{
      id: 'custom-test',
      name: '自定义测试',
      description: '测试自定义模式',
      detector: (ctx: string) => ctx.includes('跳过测试'),
      remediation: '必须运行测试',
    }];
    const patterns = detectSkipPatterns('跳过测试直接部署', custom);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].id).toBe('custom-test');
  });
});
