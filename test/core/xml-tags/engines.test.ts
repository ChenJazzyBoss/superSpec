import { describe, it, expect } from 'vitest';
import { evaluateHardGate } from '../../../src/core/xml-tags/engines/hard-gate.js';
import { evaluateExtremelyImportant } from '../../../src/core/xml-tags/engines/extremely-important.js';
import { shouldSkipForSubagent } from '../../../src/core/xml-tags/engines/subagent-stop.js';
import { evaluateChecklist } from '../../../src/core/xml-tags/engines/checklist.js';
import type { XmlTag } from '../../../src/core/xml-tags/types.js';

/** 构造测试用标签 */
function tag(type: XmlTag['type'], content: string): XmlTag {
  return { type, content };
}

describe('HARD-GATE 引擎', () => {
  it('条件满足时返回 allowed', () => {
    const tags: XmlTag[] = [tag('HARD-GATE', 'spec 校验已通过')];
    const result = evaluateHardGate(tags, content => content.includes('已通过'));
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('条件不满足时返回 blocked + reason', () => {
    const tags: XmlTag[] = [tag('HARD-GATE', '禁止在 main 分支开发')];
    const result = evaluateHardGate(tags, () => false);
    expect(result.allowed).toBe(false);
    expect(result.blockingTag).toBe('HARD-GATE');
    expect(result.reason).toContain('禁止在 main 分支开发');
  });

  it('无标签时返回 allowed', () => {
    const result = evaluateHardGate([], () => true);
    expect(result.allowed).toBe(true);
  });
});

describe('EXTREMELY-IMPORTANT 引擎', () => {
  it('提取强化展示列表', () => {
    const tags: XmlTag[] = [
      tag('EXTREMELY-IMPORTANT', '必须运行校验命令'),
      tag('HARD-GATE', '其他标签'),
      tag('EXTREMELY-IMPORTANT', '不得跳过测试'),
    ];
    const result = evaluateExtremelyImportant(tags);
    expect(result).toHaveLength(2);
    expect(result[0].tag.content).toBe('必须运行校验命令');
    expect(result[0].emphasis).toContain('最高优先级');
    expect(result[1].tag.content).toBe('不得跳过测试');
  });

  it('无标签时返回空列表', () => {
    const result = evaluateExtremelyImportant([]);
    expect(result).toHaveLength(0);
  });
});

describe('SUBAGENT-STOP 引擎', () => {
  it('子代理上下文 + 存在标签时返回 skip', () => {
    const tags: XmlTag[] = [tag('SUBAGENT-STOP', '跳过此技能')];
    expect(shouldSkipForSubagent(tags, true)).toBe(true);
  });

  it('非子代理上下文时返回 no skip', () => {
    const tags: XmlTag[] = [tag('SUBAGENT-STOP', '跳过此技能')];
    expect(shouldSkipForSubagent(tags, false)).toBe(false);
  });
});

describe('CHECKLIST 引擎', () => {
  it('全部完成时返回 allowed', () => {
    const tags: XmlTag[] = [
      tag('CHECKLIST', '- [ ] 运行测试\n- [ ] 检查格式'),
    ];
    const completed = new Set(['运行测试', '检查格式']);
    const result = evaluateChecklist(tags, completed);
    expect(result.allowed).toBe(true);
    expect(result.remainingItems).toBeUndefined();
  });

  it('部分完成时返回 blocked + 剩余项', () => {
    const tags: XmlTag[] = [
      tag('CHECKLIST', '- [ ] 运行测试\n- [ ] 检查格式\n- [ ] 提交代码'),
    ];
    const completed = new Set(['运行测试']);
    const result = evaluateChecklist(tags, completed);
    expect(result.allowed).toBe(false);
    expect(result.blockingTag).toBe('CHECKLIST');
    expect(result.remainingItems).toEqual(['检查格式', '提交代码']);
    expect(result.reason).toContain('2 项');
  });

  it('空清单时返回 allowed', () => {
    const tags: XmlTag[] = [tag('CHECKLIST', '')];
    const result = evaluateChecklist(tags, new Set());
    expect(result.allowed).toBe(true);
  });
});
