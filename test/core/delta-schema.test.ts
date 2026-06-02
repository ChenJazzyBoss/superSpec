import { describe, it, expect } from 'vitest';
import { DeltaSchema, ChangeSchema } from '../../src/core/delta-schema.js';

describe('DeltaSchema', () => {
  const validDelta = {
    specName: 'batch-export',
    changes: [
      { type: 'ADDED' as const, section: 'requirement' as const, target: 'PDF 导出', content: '系统 SHALL 支持 PDF 格式导出' },
      { type: 'MODIFIED' as const, section: 'requirement' as const, target: '导出格式支持', newValue: '系统 SHALL 支持 CSV 和 XLSX 格式' },
      { type: 'REMOVED' as const, section: 'requirement' as const, target: '批量处理' },
      { type: 'RENAMED' as const, section: 'requirement' as const, target: '导出格式', newValue: '导出格式支持' },
    ],
  };

  it('正确数据通过校验', () => {
    const result = DeltaSchema.safeParse(validDelta);
    expect(result.success).toBe(true);
  });

  it('空 changes 被拒绝', () => {
    const result = DeltaSchema.safeParse({ ...validDelta, changes: [] });
    expect(result.success).toBe(false);
  });

  it('ADDED 没有 content 被拒绝', () => {
    const result = DeltaSchema.safeParse({
      specName: 'test',
      changes: [{ type: 'ADDED', section: 'requirement', target: '新需求' }],
    });
    expect(result.success).toBe(false);
  });

  it('MODIFIED 没有 newValue 被拒绝', () => {
    const result = DeltaSchema.safeParse({
      specName: 'test',
      changes: [{ type: 'MODIFIED', section: 'requirement', target: '需求' }],
    });
    expect(result.success).toBe(false);
  });

  it('scenario 变更没有 parent 被拒绝', () => {
    const result = DeltaSchema.safeParse({
      specName: 'test',
      changes: [{ type: 'ADDED', section: 'scenario', target: '场景', content: '内容' }],
    });
    expect(result.success).toBe(false);
  });

  it('无效 type 被拒绝', () => {
    const result = DeltaSchema.safeParse({
      specName: 'test',
      changes: [{ type: 'INVALID', section: 'requirement', target: 'x' }],
    });
    expect(result.success).toBe(false);
  });

  it('空 specName 被拒绝', () => {
    const result = DeltaSchema.safeParse({
      specName: '',
      changes: [{ type: 'REMOVED', section: 'requirement', target: 'x' }],
    });
    expect(result.success).toBe(false);
  });
});
