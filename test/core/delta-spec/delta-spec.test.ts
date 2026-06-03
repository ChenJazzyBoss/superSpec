import { describe, it, expect } from 'vitest';
import { validateDeltaFormat, validateDeltaSemantics } from '../../../src/core/delta-spec/validator.js';
import { detectConflicts } from '../../../src/core/delta-spec/conflict-detector.js';
import { applyDelta } from '../../../src/core/delta-spec/merger.js';
import type { DeltaSpec, DeltaOperation } from '../../../src/core/delta-spec/types.js';

describe('Delta Spec 格式校验', () => {
  it('合法 delta 通过格式校验', () => {
    const delta: DeltaSpec = {
      baseSpec: 'specs/auth.md',
      operations: [
        { operation: 'ADDED', path: 'requirements.oauth', content: '系统 SHALL 支持 OAuth2.0 认证' },
        { operation: 'MODIFIED', path: 'requirements.login', before: '用户名密码登录', after: '支持多种登录方式' },
        { operation: 'REMOVED', path: 'requirements.legacy', content: '旧版认证方式' },
        { operation: 'RENAMED', path: '', oldPath: 'requirements.auth', newPath: 'requirements.authentication' },
      ],
      metadata: { author: 'test', timestamp: '2026-01-01', description: '测试变更' },
    };
    const result = validateDeltaFormat(delta);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('缺少 baseSpec 时校验失败', () => {
    const delta = {
      baseSpec: '',
      operations: [{ operation: 'ADDED' as const, path: 'test', content: '内容' }],
      metadata: { author: 'test', timestamp: '2026-01-01', description: '测试' },
    } as DeltaSpec;
    const result = validateDeltaFormat(delta);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('baseSpec'));
  });

  it('ADDED 缺少 content 时校验失败', () => {
    const delta: DeltaSpec = {
      baseSpec: 'specs/test.md',
      operations: [{ operation: 'ADDED', path: 'requirements.new', content: '' } as DeltaOperation],
      metadata: { author: 'test', timestamp: '2026-01-01', description: '测试' },
    };
    const result = validateDeltaFormat(delta);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ADDED') && e.includes('content'))).toBe(true);
  });

  it('MODIFIED 缺少 before/after 时校验失败', () => {
    const delta: DeltaSpec = {
      baseSpec: 'specs/test.md',
      operations: [{ operation: 'MODIFIED', path: 'requirements.login', before: '', after: '' } as DeltaOperation],
      metadata: { author: 'test', timestamp: '2026-01-01', description: '测试' },
    };
    const result = validateDeltaFormat(delta);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('MODIFIED') && e.includes('before'))).toBe(true);
  });
});

describe('Delta Spec 语义校验', () => {
  const baseSpec = `# Auth Spec
requirements.login: 用户名密码登录
requirements.mfa: 双因素认证`;

  it('ADDED 路径已存在时校验失败', () => {
    const delta: DeltaSpec = {
      baseSpec: 'specs/auth.md',
      operations: [{ operation: 'ADDED', path: 'requirements.login', content: '新登录方式' }],
      metadata: { author: 'test', timestamp: '2026-01-01', description: '测试' },
    };
    const result = validateDeltaSemantics(delta, baseSpec);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('已存在'))).toBe(true);
  });

  it('MODIFIED 路径不存在时校验失败', () => {
    const delta: DeltaSpec = {
      baseSpec: 'specs/auth.md',
      operations: [{ operation: 'MODIFIED', path: 'requirements.oauth', before: '旧', after: '新' }],
      metadata: { author: 'test', timestamp: '2026-01-01', description: '测试' },
    };
    const result = validateDeltaSemantics(delta, baseSpec);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('不存在'))).toBe(true);
  });

  it('REMOVED 路径不存在时校验失败', () => {
    const delta: DeltaSpec = {
      baseSpec: 'specs/auth.md',
      operations: [{ operation: 'REMOVED', path: 'requirements.nonexist', content: '内容' }],
      metadata: { author: 'test', timestamp: '2026-01-01', description: '测试' },
    };
    const result = validateDeltaSemantics(delta, baseSpec);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('不存在'))).toBe(true);
  });

  it('语义正确的 delta 通过校验', () => {
    const delta: DeltaSpec = {
      baseSpec: 'specs/auth.md',
      operations: [
        { operation: 'ADDED', path: 'requirements.oauth', content: 'OAuth2.0 支持' },
        { operation: 'MODIFIED', path: 'requirements.login', before: '用户名密码登录', after: '多种登录方式' },
      ],
      metadata: { author: 'test', timestamp: '2026-01-01', description: '测试' },
    };
    const result = validateDeltaSemantics(delta, baseSpec);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('Delta Spec 冲突检测', () => {
  it('检测同一 path 的 ADDED + REMOVED 矛盾操作', () => {
    const operations: DeltaOperation[] = [
      { operation: 'ADDED', path: 'requirements.login', content: '新登录' },
      { operation: 'REMOVED', path: 'requirements.login', content: '旧登录' },
    ];
    const conflicts = detectConflicts(operations);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].severity).toBe('error');
    expect(conflicts[0].type).toBe('contradiction');
  });

  it('RENAMED newPath 与 ADDED path 冲突时检测', () => {
    const operations: DeltaOperation[] = [
      { operation: 'RENAMED', path: '', oldPath: 'requirements.auth', newPath: 'requirements.login' },
      { operation: 'ADDED', path: 'requirements.login', content: '新内容' },
    ];
    const conflicts = detectConflicts(operations);
    expect(conflicts.some(c => c.type === 'path' && c.severity === 'error')).toBe(true);
  });

  it('多个 RENAMED 目标到同一路径时检测', () => {
    const operations: DeltaOperation[] = [
      { operation: 'RENAMED', path: '', oldPath: 'requirements.a', newPath: 'requirements.c' },
      { operation: 'RENAMED', path: '', oldPath: 'requirements.b', newPath: 'requirements.c' },
    ];
    const conflicts = detectConflicts(operations);
    expect(conflicts.some(c => c.type === 'path' && c.detail.includes('多个 RENAMED'))).toBe(true);
  });

  it('无冲突时返回空数组', () => {
    const operations: DeltaOperation[] = [
      { operation: 'ADDED', path: 'requirements.new', content: '新需求' },
      { operation: 'MODIFIED', path: 'requirements.existing', before: '旧', after: '新' },
    ];
    const conflicts = detectConflicts(operations);
    expect(conflicts).toHaveLength(0);
  });
});

describe('Delta Spec 合并', () => {
  const baseSpec = `# Test Spec
requirements.login: 用户名密码登录
requirements.mfa: 双因素认证`;

  it('ADDED 操作 — 在基准中插入内容', () => {
    const delta: DeltaSpec = {
      baseSpec: 'specs/test.md',
      operations: [{ operation: 'ADDED', path: 'requirements.oauth', content: '系统 SHALL 支持 OAuth2.0 认证' }],
      metadata: { author: 'test', timestamp: '2026-01-01', description: '添加 OAuth' },
    };
    const result = applyDelta(baseSpec, delta);
    expect(result.success).toBe(true);
    expect(result.result).toContain('requirements.oauth');
    expect(result.result).toContain('OAuth2.0');
  });

  it('MODIFIED 操作 — 替换内容', () => {
    const delta: DeltaSpec = {
      baseSpec: 'specs/test.md',
      operations: [{ operation: 'MODIFIED', path: 'requirements.login', before: '用户名密码登录', after: '支持多种登录方式' }],
      metadata: { author: 'test', timestamp: '2026-01-01', description: '修改登录方式' },
    };
    const result = applyDelta(baseSpec, delta);
    expect(result.success).toBe(true);
    expect(result.result).toContain('支持多种登录方式');
    expect(result.result).not.toContain('用户名密码登录');
  });

  it('REMOVED 操作 — 删除内容', () => {
    const delta: DeltaSpec = {
      baseSpec: 'specs/test.md',
      operations: [{ operation: 'REMOVED', path: 'requirements.mfa', content: 'requirements.mfa: 双因素认证' }],
      metadata: { author: 'test', timestamp: '2026-01-01', description: '删除 MFA' },
    };
    const result = applyDelta(baseSpec, delta);
    expect(result.success).toBe(true);
    expect(result.result).not.toContain('双因素认证');
  });

  it('RENAMED 操作 — 重命名路径', () => {
    const delta: DeltaSpec = {
      baseSpec: 'specs/test.md',
      operations: [{ operation: 'RENAMED', path: '', oldPath: 'requirements.mfa', newPath: 'requirements.multiFactorAuth' }],
      metadata: { author: 'test', timestamp: '2026-01-01', description: '重命名 MFA' },
    };
    const result = applyDelta(baseSpec, delta);
    expect(result.success).toBe(true);
    expect(result.result).toContain('requirements.multiFactorAuth');
    expect(result.result).not.toContain('requirements.mfa');
  });

  it('格式校验失败时合并不执行', () => {
    const delta = {
      baseSpec: '',
      operations: [],
      metadata: { author: 'test', timestamp: '2026-01-01', description: '无效 delta' },
    } as DeltaSpec;
    const result = applyDelta(baseSpec, delta);
    expect(result.success).toBe(false);
    expect(result.log.some(l => l.includes('格式校验失败'))).toBe(true);
  });

  it('存在冲突时合并不执行', () => {
    const delta: DeltaSpec = {
      baseSpec: 'specs/test.md',
      operations: [
        { operation: 'ADDED', path: 'requirements.login', content: '新登录' },
        { operation: 'REMOVED', path: 'requirements.login', content: '旧登录' },
      ],
      metadata: { author: 'test', timestamp: '2026-01-01', description: '冲突 delta' },
    };
    const result = applyDelta(baseSpec, delta);
    expect(result.success).toBe(false);
    expect(result.conflicts).toBeDefined();
    expect(result.conflicts!.length).toBeGreaterThan(0);
  });

  it('合并日志记录所有操作', () => {
    const delta: DeltaSpec = {
      baseSpec: 'specs/test.md',
      operations: [
        { operation: 'ADDED', path: 'requirements.new', content: '新需求' },
        { operation: 'MODIFIED', path: 'requirements.login', before: '用户名密码登录', after: '多种登录' },
      ],
      metadata: { author: 'test', timestamp: '2026-01-01', description: '多操作合并' },
    };
    const result = applyDelta(baseSpec, delta);
    expect(result.success).toBe(true);
    expect(result.log.length).toBeGreaterThan(0);
    expect(result.log.some(l => l.includes('ADDED'))).toBe(true);
    expect(result.log.some(l => l.includes('MODIFIED'))).toBe(true);
    expect(result.log.some(l => l.includes('合并完成'))).toBe(true);
  });
});
