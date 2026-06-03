import { describe, it, expect } from 'vitest';
import { parseRedFlags } from '../../../src/core/anti-rationalization/red-flag-loader.js';
import { detectRedFlag } from '../../../src/core/anti-rationalization/red-flag-detector.js';
import type { RedFlag } from '../../../src/core/anti-rationalization/types.js';

describe('parseRedFlags', () => {
  it('解析包含红线表的 Markdown 内容', () => {
    const content = [
      '# 技能说明',
      '',
      '## 红线表',
      '',
      '| 跳步借口 | 现实 |',
      '| --- | --- |',
      '| Purpose 太简单可以跳过 | Purpose 是 spec 的灵魂，缺失会导致方向偏差 |',
      '| 我已经知道需求了不需要写 | 未文档化的需求会随时间遗忘和扭曲 |',
      '| 先写代码再补 spec | 先编码后补 spec 会导致 spec 沦为代码的注释 |',
      '',
      '## 其他内容',
    ].join('\n');

    const result = parseRedFlags(content);

    expect(result).toHaveLength(3);
    expect(result[0].excuse).toBe('Purpose 太简单可以跳过');
    expect(result[0].reality).toBe('Purpose 是 spec 的灵魂，缺失会导致方向偏差');
    expect(result[1].excuse).toBe('我已经知道需求了不需要写');
    expect(result[1].reality).toBe('未文档化的需求会随时间遗忘和扭曲');
    expect(result[2].excuse).toBe('先写代码再补 spec');
    expect(result[2].reality).toBe('先编码后补 spec 会导致 spec 沦为代码的注释');
  });

  it('无红线表时返回空数组', () => {
    const content = [
      '# 技能说明',
      '',
      '这里没有红线表。',
      '',
      '| 普通表格 | 列 |',
      '| --- | --- |',
      '| 数据 | 值 |',
    ].join('\n');

    const result = parseRedFlags(content);

    expect(result).toHaveLength(0);
  });

  it('空内容返回空数组', () => {
    const result = parseRedFlags('');
    expect(result).toHaveLength(0);
  });

  it('只有表头没有数据行返回空数组', () => {
    const content = [
      '| 跳步借口 | 现实 |',
      '| --- | --- |',
    ].join('\n');

    const result = parseRedFlags(content);
    expect(result).toHaveLength(0);
  });
});

describe('detectRedFlag', () => {
  const redFlags: RedFlag[] = [
    {
      excuse: 'Purpose 太简单可以跳过',
      reality: 'Purpose 是 spec 的灵魂',
    },
    {
      excuse: '先写代码再补 spec',
      reality: '先编码后补 spec 会导致 spec 沦为代码的注释',
    },
    {
      excuse: '校验太慢了直接跳过',
      reality: '校验是质量保障的最后防线',
      pattern: '跳过.*校验',
    },
  ];

  it('匹配借口关键词', () => {
    const result = detectRedFlag('我觉得 Purpose 太简单可以跳过，直接写 Requirements 吧', redFlags);

    expect(result).not.toBeNull();
    expect(result!.excuse).toBe('Purpose 太简单可以跳过');
  });

  it('无匹配时返回 null', () => {
    const result = detectRedFlag('我正在认真编写 Purpose 章节', redFlags);

    expect(result).toBeNull();
  });

  it('空输入不崩溃且返回 null', () => {
    const result = detectRedFlag('', redFlags);
    expect(result).toBeNull();
  });

  it('空红线表不崩溃且返回 null', () => {
    const result = detectRedFlag('随便什么输入', []);
    expect(result).toBeNull();
  });

  it('正则 pattern 匹配', () => {
    const result = detectRedFlag('校验太慢了我们跳过校验吧', redFlags);

    expect(result).not.toBeNull();
    expect(result!.excuse).toBe('校验太慢了直接跳过');
  });

  it('大小写不敏感匹配', () => {
    const flags: RedFlag[] = [
      { excuse: 'skip validation', reality: '必须校验' },
    ];

    const result = detectRedFlag('Let us SKIP VALIDATION for now', flags);

    expect(result).not.toBeNull();
    expect(result!.excuse).toBe('skip validation');
  });
});
