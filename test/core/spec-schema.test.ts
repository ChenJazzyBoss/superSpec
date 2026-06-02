import { describe, it, expect } from 'vitest';
import { SpecSchema, RequirementSchema, ScenarioSchema } from '../../src/core/spec-schema.js';

describe('SpecSchema', () => {
  const validSpec = {
    name: 'batch-export',
    overview: '用户需要能够将系统中的数据批量导出为 CSV 和 Excel 格式，支持按时间范围筛选，导出任务异步执行。',
    requirements: [{
      name: '导出格式支持',
      text: '系统 SHALL 支持 CSV 和 XLSX 两种导出格式',
      scenarios: [
        { name: 'CSV 导出', rawText: 'Given 用户在导出页面\nWhen 选择 CSV 格式\nThen 生成 CSV 文件' },
        { name: 'XLSX 导出', rawText: 'Given 用户在导出页面\nWhen 选择 XLSX 格式\nThen 生成 XLSX 文件' },
      ],
    }],
    metadata: { version: '1.0.0', format: 'superspec' as const },
  };

  it('正确数据通过校验', () => {
    const result = SpecSchema.safeParse(validSpec);
    expect(result.success).toBe(true);
  });

  it('Purpose 不足 50 字被拒绝', () => {
    const result = SpecSchema.safeParse({ ...validSpec, overview: '太短了' });
    expect(result.success).toBe(false);
  });

  it('需求缺少 SHALL/MUST 被拒绝', () => {
    const result = SpecSchema.safeParse({
      ...validSpec,
      requirements: [{ ...validSpec.requirements[0], text: '支持 CSV 格式' }],
    });
    expect(result.success).toBe(false);
  });

  it('场景数不足被拒绝', () => {
    const result = SpecSchema.safeParse({
      ...validSpec,
      requirements: [{ ...validSpec.requirements[0], scenarios: [validSpec.requirements[0].scenarios[0]] }],
    });
    expect(result.success).toBe(false);
  });

  it('空 requirements 被拒绝', () => {
    const result = SpecSchema.safeParse({ ...validSpec, requirements: [] });
    expect(result.success).toBe(false);
  });
});
