/**
 * 状态流转图生成器测试
 *
 * 测试 generateStateDiagram 在各种校验报告场景下的输出。
 */

import { describe, it, expect } from 'vitest';
import { generateStateDiagram } from '../../../src/core/diagrams/state.js';
import type { ValidationReport } from '../../../src/core/validator.js';

/** 辅助函数：创建校验报告 */
function makeReport(overrides: Partial<ValidationReport> = {}): ValidationReport {
  return {
    valid: true,
    issues: [],
    summary: { errors: 0, warnings: 0, info: 0 },
    ...overrides,
  };
}

describe('generateStateDiagram', () => {
  it('全通过 — 只包含 待校验→校验中→通过', () => {
    const report = makeReport({ valid: true });
    const output = generateStateDiagram(report);

    expect(output).toContain('待校验 --> 校验中');
    expect(output).toContain('校验中 --> 通过');
    expect(output).not.toContain('有错误');
    expect(output).not.toContain('有警告');
    expect(output).not.toContain('strictMode失败');
  });

  it('有错误 — 包含有错误状态和重新校验路径', () => {
    const report = makeReport({
      valid: false,
      summary: { errors: 2, warnings: 0, info: 0 },
    });
    const output = generateStateDiagram(report);

    expect(output).toContain('校验中 --> 有错误');
    expect(output).toContain('有错误 --> 校验中 : 修复后重新校验');
  });

  it('有警告无错误 — 包含有警告状态', () => {
    const report = makeReport({
      valid: true,
      summary: { errors: 0, warnings: 3, info: 0 },
    });
    const output = generateStateDiagram(report);

    expect(output).toContain('校验中 --> 有警告');
    expect(output).toContain('有警告 --> 校验中 : 修复后重新校验');
    expect(output).not.toContain('有错误');
  });

  it('strictMode + warnings — 包含 strictMode失败 状态', () => {
    const report = makeReport({
      valid: false,
      summary: { errors: 0, warnings: 1, info: 0 },
    });
    const output = generateStateDiagram(report, true);

    expect(output).toContain('有警告 --> strictMode失败');
    expect(output).toContain('strictMode失败 --> [*]');
  });

  it('输出包含 stateDiagram-v2', () => {
    const report = makeReport();
    const output = generateStateDiagram(report);

    expect(output).toMatch(/^stateDiagram-v2/m);
  });

  it('输出包含所有必要状态节点', () => {
    const report = makeReport({
      valid: false,
      summary: { errors: 1, warnings: 2, info: 0 },
    });
    const output = generateStateDiagram(report, true);

    // 基础状态
    expect(output).toContain('[*]');
    expect(output).toContain('待校验');
    expect(output).toContain('校验中');
    // 错误场景状态
    expect(output).toContain('有错误');
  });

  it('有错误时不包含 "通过" 状态', () => {
    const report = makeReport({
      valid: false,
      summary: { errors: 5, warnings: 0, info: 0 },
    });
    const output = generateStateDiagram(report);

    expect(output).not.toContain('通过');
    expect(output).not.toContain('--> [*]');
  });
});
