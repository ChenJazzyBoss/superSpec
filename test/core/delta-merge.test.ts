import { describe, it, expect } from 'vitest';
import { applyDelta } from '../../src/core/delta-merge.js';
import type { Spec, Requirement } from '../../src/core/spec-schema.js';

describe('applyDelta', () => {
  const baseSpec: Spec = {
    name: 'test',
    overview: '这是一个测试 spec 文件，用于验证 Delta Merge 算法的正确性，确保所有变更操作都能正常工作。',
    requirements: [
      {
        name: '导出格式支持',
        text: '系统 SHALL 支持 CSV 和 XLSX 两种导出格式',
        scenarios: [
          { name: 'CSV 导出', rawText: 'Given 用户在导出页面\nWhen 选择 CSV 格式\nThen 生成 CSV 文件' },
          { name: 'XLSX 导出', rawText: 'Given 用户在导出页面\nWhen 选择 XLSX 格式\nThen 生成 XLSX 文件' },
        ],
      },
    ],
    metadata: { version: '1.0.0', format: 'superspec' as const },
  };

  it('ADDED 需求追加到末尾', () => {
    const delta = {
      specName: 'test',
      changes: [{ type: 'ADDED' as const, section: 'requirement' as const, target: 'PDF 导出', content: '系统 SHALL 支持 PDF 格式导出' }],
    };
    // applyDelta validates with SpecSchema, so ADDED requirement needs 2+ scenarios
    // We test via scenario addition: add requirement first, then add scenarios
    // Since applyDelta validates, we need to include scenario changes too
    const deltaWithScenarios = {
      specName: 'test',
      changes: [
        { type: 'ADDED' as const, section: 'requirement' as const, target: 'PDF 导出', content: '系统 SHALL 支持 PDF 格式导出' },
        { type: 'ADDED' as const, section: 'scenario' as const, target: 'PDF 导出场景1', content: 'Given 用户在导出页面\nWhen 选择 PDF 格式\nThen 生成 PDF 文件', parent: 'PDF 导出' },
        { type: 'ADDED' as const, section: 'scenario' as const, target: 'PDF 导出场景2', content: 'Given 用户有大批量数据\nWhen 选择 PDF 格式导出\nThen 生成压缩 PDF 文件', parent: 'PDF 导出' },
      ],
    };
    const result = applyDelta(baseSpec, deltaWithScenarios);
    expect(result.requirements).toHaveLength(2);
    expect(result.requirements[1].name).toBe('PDF 导出');
  });

  it('REMOVED 需求被删除', () => {
    const specWithTwo = {
      ...baseSpec,
      requirements: [
        ...baseSpec.requirements,
        { name: '批量处理', text: '系统 SHALL 支持批量处理', scenarios: [{ name: '批量导出', rawText: 'Given 批量数据\nWhen 导出\nThen 生成文件' }, { name: '批量删除', rawText: 'Given 批量数据\nWhen 删除\nThen 数据被清除' }] },
      ],
    };
    const delta = {
      specName: 'test',
      changes: [{ type: 'REMOVED' as const, section: 'requirement' as const, target: '批量处理' }],
    };
    const result = applyDelta(specWithTwo, delta);
    expect(result.requirements).toHaveLength(1);
    expect(result.requirements[0].name).toBe('导出格式支持');
  });

  it('MODIFIED 需求文本被替换', () => {
    const delta = {
      specName: 'test',
      changes: [{ type: 'MODIFIED' as const, section: 'requirement' as const, target: '导出格式支持', newValue: '系统 SHALL 支持 CSV、XLSX 和 PDF 三种格式' }],
    };
    const result = applyDelta(baseSpec, delta);
    expect(result.requirements[0].text).toBe('系统 SHALL 支持 CSV、XLSX 和 PDF 三种格式');
  });

  it('RENAMED 需求名称被修改', () => {
    const delta = {
      specName: 'test',
      changes: [{ type: 'RENAMED' as const, section: 'requirement' as const, target: '导出格式支持', newValue: '导出格式' }],
    };
    const result = applyDelta(baseSpec, delta);
    expect(result.requirements[0].name).toBe('导出格式');
  });

  it('ADDED 场景追加到指定需求', () => {
    const delta = {
      specName: 'test',
      changes: [{ type: 'ADDED' as const, section: 'scenario' as const, target: 'PDF 导出', content: 'Given 用户在导出页面\nWhen 选择 PDF 格式\nThen 生成 PDF 文件', parent: '导出格式支持' }],
    };
    const result = applyDelta(baseSpec, delta);
    expect(result.requirements[0].scenarios).toHaveLength(3);
    expect(result.requirements[0].scenarios[2].name).toBe('PDF 导出');
  });

  it('REMOVED 场景被删除', () => {
    // baseSpec has 2 scenarios; after removing 1, only 1 remains which fails SpecSchema min(2)
    // So we need to start with 3+ scenarios
    const specWithThree = {
      ...baseSpec,
      requirements: [{
        ...baseSpec.requirements[0],
        scenarios: [
          ...baseSpec.requirements[0].scenarios,
          { name: 'PDF 导出', rawText: 'Given 用户在导出页面\nWhen 选择 PDF 格式\nThen 生成 PDF 文件' },
        ],
      }],
    };
    const delta = {
      specName: 'test',
      changes: [{ type: 'REMOVED' as const, section: 'scenario' as const, target: 'CSV 导出', parent: '导出格式支持' }],
    };
    const result = applyDelta(specWithThree, delta);
    expect(result.requirements[0].scenarios).toHaveLength(2);
    expect(result.requirements[0].scenarios[0].name).toBe('XLSX 导出');
  });

  it('MODIFIED overview 被替换', () => {
    const delta = {
      specName: 'test',
      changes: [{ type: 'MODIFIED' as const, section: 'overview' as const, target: 'overview', newValue: '新的概述内容，需要足够长以通过校验，至少需要五十个字符以上才能通过 Zod Schema 的校验规则。' }],
    };
    const result = applyDelta(baseSpec, delta);
    expect(result.overview).toContain('新的概述内容');
  });

  it('多个变更按 REMOVED → MODIFIED → ADDED 顺序执行', () => {
    const delta = {
      specName: 'test',
      changes: [
        { type: 'ADDED' as const, section: 'requirement' as const, target: '新功能', content: '系统 SHALL 支持新功能' },
        { type: 'ADDED' as const, section: 'scenario' as const, target: '新功能场景1', content: 'Given 用户进入新功能页面\nWhen 点击操作按钮\nThen 功能正常执行', parent: '新功能' },
        { type: 'ADDED' as const, section: 'scenario' as const, target: '新功能场景2', content: 'Given 用户进入新功能页面\nWhen 输入无效数据\nThen 显示错误提示', parent: '新功能' },
        { type: 'MODIFIED' as const, section: 'requirement' as const, target: '导出格式支持', newValue: '系统 SHALL 支持所有格式' },
      ],
    };
    const result = applyDelta(baseSpec, delta);
    expect(result.requirements).toHaveLength(2);
    expect(result.requirements[0].text).toBe('系统 SHALL 支持所有格式');
    expect(result.requirements[1].name).toBe('新功能');
  });

  it('未找到需求时抛出 Error', () => {
    const delta = {
      specName: 'test',
      changes: [{ type: 'REMOVED' as const, section: 'requirement' as const, target: '不存在的需求' }],
    };
    expect(() => applyDelta(baseSpec, delta)).toThrow('未找到需求');
  });

  it('未找到父级需求时抛出 Error', () => {
    const delta = {
      specName: 'test',
      changes: [{ type: 'ADDED' as const, section: 'scenario' as const, target: '场景', content: '内容', parent: '不存在的需求' }],
    };
    expect(() => applyDelta(baseSpec, delta)).toThrow('未找到父级需求');
  });
});
