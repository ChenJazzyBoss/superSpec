import { describe, it, expect } from 'vitest';
import { parseChecklist } from '../../../src/core/anti-rationalization/checklist-parser.js';
import { ChecklistEngine } from '../../../src/core/anti-rationalization/checklist-enforcer.js';
import { verifyEvidence } from '../../../src/core/anti-rationalization/evidence-verifier.js';

// ==================== 检查清单解析 ====================

describe('parseChecklist', () => {
  it('解析包含 todo 和 done 的检查清单', () => {
    const content = [
      '- [ ] 编写 Purpose 章节',
      '- [x] 定义 Requirements',
      '- [ ] 编写 Scenarios',
      '- [x] 运行校验',
    ].join('\n');

    const items = parseChecklist(content);

    expect(items).toHaveLength(4);
    expect(items[0]).toEqual({ id: 1, description: '- [ ] 编写 Purpose 章节', status: 'todo' });
    expect(items[1]).toEqual({ id: 2, description: '- [x] 定义 Requirements', status: 'done' });
    expect(items[2]).toEqual({ id: 3, description: '- [ ] 编写 Scenarios', status: 'todo' });
    expect(items[3]).toEqual({ id: 4, description: '- [x] 运行校验', status: 'done' });
  });

  it('解析空内容返回空数组', () => {
    expect(parseChecklist('')).toEqual([]);
    expect(parseChecklist('   ')).toEqual([]);
    expect(parseChecklist('\n\n')).toEqual([]);
  });

  it('忽略非检查清单行', () => {
    const content = [
      '# 标题',
      '这是一段说明文字',
      '- [ ] 真正的检查项',
      '另一段文字',
      '- [x] 已完成的检查项',
    ].join('\n');

    const items = parseChecklist(content);

    expect(items).toHaveLength(2);
    expect(items[0].id).toBe(1);
    expect(items[0].status).toBe('todo');
    expect(items[1].id).toBe(2);
    expect(items[1].status).toBe('done');
  });
});

// ==================== ChecklistEngine ====================

describe('ChecklistEngine', () => {
  /** 创建测试用的检查清单 */
  function createTestItems() {
    return parseChecklist(
      ['- [ ] 第一步', '- [ ] 第二步', '- [ ] 第三步'].join('\n'),
    );
  }

  it('按顺序完成检查清单条目', () => {
    const engine = new ChecklistEngine(createTestItems());

    expect(engine.currentItem()?.id).toBe(1);

    engine.markComplete(1, '已完成第一步的证据');
    expect(engine.currentItem()?.id).toBe(2);

    engine.markComplete(2, '已完成第二步的证据');
    expect(engine.currentItem()?.id).toBe(3);

    engine.markComplete(3, '已完成第三步的证据');
    expect(engine.currentItem()).toBeNull();
  });

  it('跳步被阻止', () => {
    const engine = new ChecklistEngine(createTestItems());

    // 尝试跳到第 3 步
    expect(() => engine.markComplete(3, '试图跳步')).toThrow(/前置条目.*尚未完成/);

    // blockSkip 也应阻止
    const result = engine.blockSkip(3);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('禁止跳步');

    // 跳步尝试被记录
    expect(engine.getSkipAttempts()).toHaveLength(1);
    expect(engine.getSkipAttempts()[0].to).toBe(3);
  });

  it('空证据被拒绝', () => {
    const engine = new ChecklistEngine(createTestItems());

    expect(() => engine.markComplete(1, '')).toThrow(/证据不能为空/);
    expect(() => engine.markComplete(1, '   ')).toThrow(/证据不能为空/);

    // 条目应仍为 todo
    expect(engine.currentItem()?.id).toBe(1);
    expect(engine.currentItem()?.status).toBe('todo');
  });

  it('全部完成后 canProceed 返回 true', () => {
    const engine = new ChecklistEngine(createTestItems());

    expect(engine.canProceed()).toBe(false);

    engine.markComplete(1, '证据一');
    expect(engine.canProceed()).toBe(false);

    engine.markComplete(2, '证据二');
    expect(engine.canProceed()).toBe(false);

    engine.markComplete(3, '证据三');
    expect(engine.canProceed()).toBe(true);
  });

  it('getProgress 返回正确的进度', () => {
    const engine = new ChecklistEngine(createTestItems());

    expect(engine.getProgress()).toEqual({ completed: 0, total: 3, current: 1 });

    engine.markComplete(1, '证据');
    expect(engine.getProgress()).toEqual({ completed: 1, total: 3, current: 2 });

    engine.markComplete(2, '证据');
    engine.markComplete(3, '证据');
    expect(engine.getProgress()).toEqual({ completed: 3, total: 3, current: 3 });
  });

  it('已完成的条目可以重新访问（不阻止）', () => {
    const engine = new ChecklistEngine(createTestItems());
    engine.markComplete(1, '证据');

    const result = engine.blockSkip(1);
    expect(result.blocked).toBe(false);
  });

  it('重复标记已完成的条目为幂等操作', () => {
    const engine = new ChecklistEngine(createTestItems());
    engine.markComplete(1, '证据一');
    engine.markComplete(1, '再次标记'); // 不应抛错
    expect(engine.getProgress().completed).toBe(1);
  });
});

// ==================== 证据验证 ====================

describe('verifyEvidence', () => {
  it('有效证据被接受', () => {
    const result = verifyEvidence(
      '校验通过',
      {
        type: 'validation-output',
        content: '所有规则检查通过',
        timestamp: '2026-06-03T10:00:00Z',
      },
    );

    expect(result.accepted).toBe(true);
    expect(result.staleWarning).toBe(false);
    expect(result.reason).toBeUndefined();
  });

  it('空证据被拒绝', () => {
    const result = verifyEvidence(
      '声称完成',
      {
        type: 'validation-output',
        content: '',
        timestamp: '2026-06-03T10:00:00Z',
      },
    );

    expect(result.accepted).toBe(false);
    expect(result.reason).toContain('证据内容不能为空');
  });

  it('纯空白证据被拒绝', () => {
    const result = verifyEvidence(
      '声称完成',
      {
        type: 'test-result',
        content: '   \n  ',
        timestamp: '2026-06-03T10:00:00Z',
      },
    );

    expect(result.accepted).toBe(false);
    expect(result.reason).toContain('证据内容不能为空');
  });

  it('过期证据产生 staleWarning', () => {
    const result = verifyEvidence(
      '校验通过',
      {
        type: 'validation-output',
        content: '旧的校验结果',
        timestamp: '2026-06-03T08:00:00Z',
      },
      '2026-06-03T10:00:00Z', // lastModified 晚于证据时间
    );

    expect(result.accepted).toBe(false);
    expect(result.staleWarning).toBe(true);
    expect(result.reason).toContain('证据已过期');
  });

  it('新鲜证据通过时间检查', () => {
    const result = verifyEvidence(
      '校验通过',
      {
        type: 'validation-output',
        content: '最新的校验结果',
        timestamp: '2026-06-03T12:00:00Z',
      },
      '2026-06-03T10:00:00Z', // lastModified 早于证据时间
    );

    expect(result.accepted).toBe(true);
    expect(result.staleWarning).toBe(false);
  });

  it('非法证据类型被拒绝', () => {
    const result = verifyEvidence(
      '声称完成',
      {
        type: 'invalid-type' as any,
        content: '证据内容',
        timestamp: '2026-06-03T10:00:00Z',
      },
    );

    expect(result.accepted).toBe(false);
    expect(result.reason).toContain('非法证据类型');
  });

  it('无 lastModified 时跳过过期检查', () => {
    const result = verifyEvidence(
      '校验通过',
      {
        type: 'file-diff',
        content: 'diff --git a/file.ts ...',
        timestamp: '2020-01-01T00:00:00Z', // 很旧的时间戳
      },
      // 不传 lastModified
    );

    expect(result.accepted).toBe(true);
    expect(result.staleWarning).toBe(false);
  });
});
